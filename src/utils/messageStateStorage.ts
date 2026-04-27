/**
 * IndexedDB storage for per-message-type editor states.
 * Keys are namespaced as `${projectId}:${fullMessageName}` so two projects
 * can hold independent JSON edits for messages with the same name.
 */

const DB_NAME = 'ProtobufStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'messageStates';

export interface MessageEditorState {
  key: string;
  jsonContent: string;
  lastEditedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(new Error('Failed to open IndexedDB'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        objectStore.createIndex('lastEditedAt', 'lastEditedAt', { unique: false });
      }
    };
  });
}

function namespacedKey(projectId: string, fullMessageName: string): string {
  return `${projectId}:${fullMessageName}`;
}

export async function saveMessageState(
  projectId: string,
  fullMessageName: string,
  jsonContent: string
): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const state: MessageEditorState = {
      key: namespacedKey(projectId, fullMessageName),
      jsonContent,
      lastEditedAt: Date.now(),
    };
    const request = store.put(state);
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save message state'));
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error saving message state:', error);
    fallbackSave(projectId, fullMessageName, jsonContent);
  }
}

// Looks up `${projectId}:${name}` first; falls back to legacy unnamespaced key
// so previously-saved JSON survives the migration without an explicit copy.
export async function loadMessageState(
  projectId: string,
  fullMessageName: string
): Promise<MessageEditorState | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const namespaced = await getOne(store, namespacedKey(projectId, fullMessageName));
    if (namespaced) {
      transaction.oncomplete = () => db.close();
      return namespaced;
    }
    const legacy = await getOne(store, fullMessageName);
    transaction.oncomplete = () => db.close();
    return legacy;
  } catch (error) {
    console.error('Error loading message state:', error);
    return fallbackLoad(projectId, fullMessageName);
  }
}

function getOne(store: IDBObjectStore, key: string): Promise<MessageEditorState | null> {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve((req.result as MessageEditorState) || null);
    req.onerror = () => reject(new Error('IndexedDB get failed'));
  });
}

export async function deleteMessageState(
  projectId: string,
  fullMessageName: string
): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(namespacedKey(projectId, fullMessageName));
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete message state'));
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error deleting message state:', error);
  }
}

export async function getAllForProject(projectId: string): Promise<Record<string, string>> {
  const prefix = `${projectId}:`;
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const out: Record<string, string> = {};
    return await new Promise((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const rec = cursor.value as MessageEditorState;
          if (typeof rec.key === 'string' && rec.key.startsWith(prefix)) {
            out[rec.key.slice(prefix.length)] = rec.jsonContent;
          }
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(new Error('Cursor failed'));
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error reading project states:', error);
    return {};
  }
}

export async function setAllForProject(
  projectId: string,
  jsonStates: Record<string, string>
): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const now = Date.now();
    for (const [name, jsonContent] of Object.entries(jsonStates)) {
      store.put({ key: namespacedKey(projectId, name), jsonContent, lastEditedAt: now });
    }
    return await new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => reject(new Error('Bulk set failed'));
    });
  } catch (error) {
    console.error('Error bulk-saving project states:', error);
  }
}

export async function deleteAllForProject(projectId: string): Promise<void> {
  const prefix = `${projectId}:`;
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    return await new Promise((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          const rec = cursor.value as MessageEditorState;
          if (typeof rec.key === 'string' && rec.key.startsWith(prefix)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(new Error('Cursor failed'));
      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Error deleting project states:', error);
  }
}

// ── Fallback localStorage for browsers without IndexedDB ─────────────────────

const LOCALSTORAGE_PREFIX = 'msgState_';

function fallbackKey(projectId: string, name: string): string {
  return `${LOCALSTORAGE_PREFIX}${projectId}:${name}`;
}

function fallbackSave(projectId: string, name: string, jsonContent: string): void {
  try {
    const state: MessageEditorState = {
      key: namespacedKey(projectId, name),
      jsonContent,
      lastEditedAt: Date.now(),
    };
    localStorage.setItem(fallbackKey(projectId, name), JSON.stringify(state));
  } catch (error) {
    console.error('Fallback localStorage save failed:', error);
  }
}

function fallbackLoad(projectId: string, name: string): MessageEditorState | null {
  try {
    const data = localStorage.getItem(fallbackKey(projectId, name));
    return data ? (JSON.parse(data) as MessageEditorState) : null;
  } catch (error) {
    console.error('Fallback localStorage load failed:', error);
    return null;
  }
}
