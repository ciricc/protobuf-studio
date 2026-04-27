import type { Project, ProjectMeta, ProjectExport, ProjectsIndex } from '../types/project';

const INDEX_KEY = 'projects';
const CURRENT_KEY = 'currentProjectId';
const PROJECT_PREFIX = 'project:';

const LEGACY_KEYS = ['protoFiles', 'mainFile', 'lastProtoFile', 'lastFileName', 'lastJson'];

function readIndex(): ProjectsIndex {
  const raw = localStorage.getItem(INDEX_KEY);
  if (!raw) return { version: 1, projects: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.projects)) {
      return parsed as ProjectsIndex;
    }
  } catch {
    // fall through
  }
  return { version: 1, projects: [] };
}

function writeIndex(index: ProjectsIndex): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

export function listProjects(): ProjectMeta[] {
  const idx = readIndex();
  return [...idx.projects].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_KEY);
}

export function setCurrentProjectId(id: string | null): void {
  if (id == null) localStorage.removeItem(CURRENT_KEY);
  else localStorage.setItem(CURRENT_KEY, id);
}

export function readProject(id: string): Project | null {
  const raw = localStorage.getItem(PROJECT_PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Project;
  } catch {
    return null;
  }
}

export class ProjectStorageQuotaError extends Error {
  constructor() {
    super('Browser storage is full. Export and remove projects to free space.');
    this.name = 'ProjectStorageQuotaError';
  }
}

export function writeProject(project: Project): void {
  const updated: Project = { ...project, updatedAt: Date.now() };
  try {
    localStorage.setItem(PROJECT_PREFIX + updated.id, JSON.stringify(updated));
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new ProjectStorageQuotaError();
    }
    throw err;
  }
  const idx = readIndex();
  const meta: ProjectMeta = {
    id: updated.id,
    name: updated.name,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
  const existing = idx.projects.findIndex((p) => p.id === updated.id);
  if (existing >= 0) idx.projects[existing] = meta;
  else idx.projects.push(meta);
  writeIndex(idx);
}

export function deleteProject(id: string): void {
  localStorage.removeItem(PROJECT_PREFIX + id);
  const idx = readIndex();
  idx.projects = idx.projects.filter((p) => p.id !== id);
  writeIndex(idx);
  if (getCurrentProjectId() === id) setCurrentProjectId(null);
}

export function createEmptyProject(name: string): Project {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    mainFile: null,
    files: {},
    createdAt: now,
    updatedAt: now,
  };
}

// Run once on boot. If the user has data from before the named-projects feature
// (`protoFiles`/`mainFile` keys), wrap it into an "Untitled" project and clear
// the legacy keys. Idempotent: bails out if `projects` already exists.
export function migrateLegacyIfNeeded(): { migratedProjectId: string | null } {
  if (localStorage.getItem(INDEX_KEY)) return { migratedProjectId: null };

  const filesRaw = localStorage.getItem('protoFiles');
  if (!filesRaw) {
    writeIndex({ version: 1, projects: [] });
    for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    return { migratedProjectId: null };
  }

  let entries: [string, string][] = [];
  try {
    entries = JSON.parse(filesRaw) as [string, string][];
  } catch {
    entries = [];
  }
  const mainFile = localStorage.getItem('mainFile');
  const project: Project = {
    id: crypto.randomUUID(),
    name: 'Untitled',
    mainFile,
    files: Object.fromEntries(entries),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  writeProject(project);
  setCurrentProjectId(project.id);
  for (const k of LEGACY_KEYS) localStorage.removeItem(k);
  return { migratedProjectId: project.id };
}

export function uniqueProjectName(desired: string): string {
  const existing = new Set(listProjects().map((p) => p.name));
  if (!existing.has(desired)) return desired;
  let n = 2;
  while (existing.has(`${desired} ${n}`)) n++;
  return `${desired} ${n}`;
}

export function serializeExportPayload(project: Project, jsonStates: Record<string, string>): ProjectExport {
  return {
    version: 1,
    name: project.name,
    mainFile: project.mainFile,
    files: project.files,
    jsonStates,
  };
}

export function parseImport(text: string): ProjectExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Import file is empty.');
  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) throw new Error(`Unsupported project export version: ${obj.version}`);
  if (typeof obj.name !== 'string') throw new Error('Import file missing "name".');
  if (!obj.files || typeof obj.files !== 'object') throw new Error('Import file missing "files".');
  const files = obj.files as Record<string, unknown>;
  for (const [k, v] of Object.entries(files)) {
    if (typeof v !== 'string') throw new Error(`File content for ${k} is not a string.`);
  }
  const jsonStates = (obj.jsonStates && typeof obj.jsonStates === 'object'
    ? obj.jsonStates
    : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(jsonStates)) {
    if (typeof v !== 'string') throw new Error(`JSON state for ${k} is not a string.`);
  }
  return {
    version: 1,
    name: obj.name,
    mainFile: typeof obj.mainFile === 'string' ? obj.mainFile : null,
    files: files as Record<string, string>,
    jsonStates: jsonStates as Record<string, string>,
  };
}
