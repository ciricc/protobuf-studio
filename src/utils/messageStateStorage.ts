/**
 * IndexedDB storage for per-message-type editor states
 * Key format: {packageName}.{typeName}
 */

const DB_NAME = 'ProtobufStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'messageStates';

export interface MessageEditorState {
  /** Composite key: package.MessageType */
  key: string;
  /** JSON content of the editor */
  jsonContent: string;
  /** Timestamp of last edit */
  lastEditedAt: number;
}

/**
 * Opens or creates the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        // Index by timestamp for potential cleanup operations
        objectStore.createIndex('lastEditedAt', 'lastEditedAt', { unique: false });
      }
    };
  });
}

/**
 * Generates storage key from package and message type
 * Format: package.MessageType or just MessageType if no package
 */
export function generateStorageKey(fullMessageName: string): string {
  // fullMessageName is already in format "package.MessageType"
  return fullMessageName;
}

/**
 * Saves message editor state to IndexedDB
 */
export async function saveMessageState(
  fullMessageName: string,
  jsonContent: string
): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const state: MessageEditorState = {
      key: generateStorageKey(fullMessageName),
      jsonContent,
      lastEditedAt: Date.now(),
    };

    const request = store.put(state);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to save message state'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error saving message state:', error);
    // Fallback to localStorage if IndexedDB fails
    fallbackSaveToLocalStorage(fullMessageName, jsonContent);
  }
}

/**
 * Loads message editor state from IndexedDB
 */
export async function loadMessageState(
  fullMessageName: string
): Promise<MessageEditorState | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const key = generateStorageKey(fullMessageName);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to load message state'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error loading message state:', error);
    // Fallback to localStorage if IndexedDB fails
    return fallbackLoadFromLocalStorage(fullMessageName);
  }
}

/**
 * Deletes a specific message state
 */
export async function deleteMessageState(fullMessageName: string): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const key = generateStorageKey(fullMessageName);
    const request = store.delete(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete message state'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error deleting message state:', error);
    fallbackDeleteFromLocalStorage(fullMessageName);
  }
}

/**
 * Clears all message states from storage
 */
export async function clearAllMessageStates(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.clear();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear message states'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error clearing message states:', error);
    fallbackClearLocalStorage();
  }
}

/**
 * Gets all stored message states (for debugging/export)
 */
export async function getAllMessageStates(): Promise<MessageEditorState[]> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Failed to get all message states'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Error getting all message states:', error);
    return [];
  }
}

// Fallback localStorage functions (in case IndexedDB is not available)

const LOCALSTORAGE_PREFIX = 'msgState_';

function fallbackSaveToLocalStorage(fullMessageName: string, jsonContent: string): void {
  try {
    const key = LOCALSTORAGE_PREFIX + generateStorageKey(fullMessageName);
    const state: MessageEditorState = {
      key: generateStorageKey(fullMessageName),
      jsonContent,
      lastEditedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Fallback localStorage save failed:', error);
  }
}

function fallbackLoadFromLocalStorage(
  fullMessageName: string
): MessageEditorState | null {
  try {
    const key = LOCALSTORAGE_PREFIX + generateStorageKey(fullMessageName);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Fallback localStorage load failed:', error);
    return null;
  }
}

function fallbackDeleteFromLocalStorage(fullMessageName: string): void {
  try {
    const key = LOCALSTORAGE_PREFIX + generateStorageKey(fullMessageName);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Fallback localStorage delete failed:', error);
  }
}

function fallbackClearLocalStorage(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(LOCALSTORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Fallback localStorage clear failed:', error);
  }
}
