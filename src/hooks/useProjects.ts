import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project, ProjectMeta, ProjectExport } from '../types/project';
import {
  createEmptyProject,
  deleteProject as storageDeleteProject,
  getCurrentProjectId,
  listProjects,
  migrateLegacyIfNeeded,
  parseImport,
  readProject,
  serializeExportPayload,
  setCurrentProjectId,
  uniqueProjectName,
  writeProject,
} from '../utils/projectStorage';
import {
  deleteAllForProject,
  getAllForProject,
  setAllForProject,
} from '../utils/messageStateStorage';

interface ProtobufApi {
  loadedFiles: Map<string, string>;
  mainFile: string | null;
  loadProtoFiles: (
    files: { content: string; importPath: string }[],
    mainImportPath?: string,
    preferredMessage?: string
  ) => Promise<void>;
  clearProto: () => void;
}

export interface UseProjectsApi {
  projects: ProjectMeta[];
  currentProjectId: string | null;
  currentProject: ProjectMeta | null;
  ready: boolean;
  refreshIndex: () => void;
  createProject: (name?: string) => Promise<string>;
  switchProject: (id: string) => Promise<void>;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => Promise<void>;
  exportCurrent: () => Promise<void>;
  importFromFile: (file: File) => Promise<void>;
  /** Persist outgoing project's files+mainFile snapshot. Called before destructive ops. */
  persistCurrent: () => void;
}

export function useProjects(protobuf: ProtobufApi, flushPendingJsonEdit: () => void): UseProjectsApi {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const switchInFlight = useRef(false);

  const refreshIndex = useCallback(() => {
    setProjects(listProjects());
  }, []);

  // ── Boot: migrate legacy data, ensure at least one project exists ─────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      migrateLegacyIfNeeded();

      let activeId = getCurrentProjectId();
      let list = listProjects();

      if (list.length === 0) {
        const empty = createEmptyProject('Untitled');
        writeProject(empty);
        setCurrentProjectId(empty.id);
        activeId = empty.id;
        list = listProjects();
      } else if (!activeId || !list.find((p) => p.id === activeId)) {
        activeId = list[0].id;
        setCurrentProjectId(activeId);
      }

      const active = activeId ? readProject(activeId) : null;

      if (cancelled) return;
      setProjects(list);
      setCurrentProjectIdState(activeId);

      if (active) {
        const files = Object.entries(active.files).map(([importPath, content]) => ({
          importPath,
          content,
        }));
        if (files.length > 0) {
          await protobuf.loadProtoFiles(files, active.mainFile ?? undefined);
        }
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist outgoing project files whenever loadedFiles changes ───────────
  const persistCurrent = useCallback(() => {
    if (!currentProjectId) return;
    const existing = readProject(currentProjectId);
    if (!existing) return;
    const files: Record<string, string> = {};
    for (const [path, content] of protobuf.loadedFiles.entries()) {
      files[path] = content;
    }
    writeProject({
      ...existing,
      files,
      mainFile: protobuf.mainFile,
    });
    setProjects(listProjects());
  }, [currentProjectId, protobuf.loadedFiles, protobuf.mainFile]);

  // Auto-persist file changes (debounced). Skip when in-memory state is empty
  // but the saved slot has files — that happens transiently right after a switch
  // (clearProto fires before loadProtoFiles resolves) and persisting then would
  // wipe the project's files.
  useEffect(() => {
    if (!ready || !currentProjectId) return;
    const slot = readProject(currentProjectId);
    const slotHasFiles = !!slot && Object.keys(slot.files).length > 0;
    if (slotHasFiles && protobuf.loadedFiles.size === 0) return;
    const id = setTimeout(persistCurrent, 300);
    return () => clearTimeout(id);
  }, [ready, currentProjectId, protobuf.loadedFiles, protobuf.mainFile, persistCurrent]);

  const createProject = useCallback(
    async (name?: string): Promise<string> => {
      flushPendingJsonEdit();
      persistCurrent();
      const project = createEmptyProject(name ?? uniqueProjectName('Untitled'));
      writeProject(project);
      setCurrentProjectId(project.id);
      protobuf.clearProto();
      setProjects(listProjects());
      setCurrentProjectIdState(project.id);
      return project.id;
    },
    [flushPendingJsonEdit, persistCurrent, protobuf]
  );

  const switchProject = useCallback(
    async (id: string) => {
      if (switchInFlight.current) return;
      if (id === currentProjectId) return;
      switchInFlight.current = true;
      try {
        flushPendingJsonEdit();
        persistCurrent();
        const next = readProject(id);
        if (!next) return;
        setCurrentProjectId(id);
        protobuf.clearProto();
        setCurrentProjectIdState(id);
        const files = Object.entries(next.files).map(([importPath, content]) => ({
          importPath,
          content,
        }));
        if (files.length > 0) {
          await protobuf.loadProtoFiles(files, next.mainFile ?? undefined);
        }
        setProjects(listProjects());
      } finally {
        switchInFlight.current = false;
      }
    },
    [currentProjectId, flushPendingJsonEdit, persistCurrent, protobuf]
  );

  const renameProject = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const project = readProject(id);
    if (!project) return;
    writeProject({ ...project, name: trimmed });
    setProjects(listProjects());
  }, []);

  const deleteProject = useCallback(
    async (id: string) => {
      const wasActive = id === currentProjectId;
      await deleteAllForProject(id);
      storageDeleteProject(id);

      if (!wasActive) {
        setProjects(listProjects());
        return;
      }

      const remaining = listProjects();
      if (remaining.length > 0) {
        await switchProject(remaining[0].id);
      } else {
        const empty = createEmptyProject('Untitled');
        writeProject(empty);
        setCurrentProjectId(empty.id);
        protobuf.clearProto();
        setCurrentProjectIdState(empty.id);
        setProjects(listProjects());
      }
    },
    [currentProjectId, protobuf, switchProject]
  );

  const exportCurrent = useCallback(async () => {
    if (!currentProjectId) return;
    flushPendingJsonEdit();
    persistCurrent();
    const project = readProject(currentProjectId);
    if (!project) return;
    const jsonStates = await getAllForProject(currentProjectId);
    const payload: ProjectExport = serializeExportPayload(project, jsonStates);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9-_]+/gi, '_') || 'project'}.protostudio.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentProjectId, flushPendingJsonEdit, persistCurrent]);

  const importFromFile = useCallback(
    async (file: File) => {
      const text = await file.text();
      const payload = parseImport(text);

      flushPendingJsonEdit();
      persistCurrent();

      const newName = uniqueProjectName(payload.name || 'Imported');
      const project: Project = {
        id: crypto.randomUUID(),
        name: newName,
        mainFile: payload.mainFile,
        files: payload.files,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      writeProject(project);
      await setAllForProject(project.id, payload.jsonStates);

      setCurrentProjectId(project.id);
      protobuf.clearProto();
      setCurrentProjectIdState(project.id);

      const files = Object.entries(project.files).map(([importPath, content]) => ({
        importPath,
        content,
      }));
      if (files.length > 0) {
        await protobuf.loadProtoFiles(files, project.mainFile ?? undefined);
      }
      setProjects(listProjects());
    },
    [flushPendingJsonEdit, persistCurrent, protobuf]
  );

  const currentProject = currentProjectId
    ? projects.find((p) => p.id === currentProjectId) ?? null
    : null;

  return {
    projects,
    currentProjectId,
    currentProject,
    ready,
    refreshIndex,
    createProject,
    switchProject,
    renameProject,
    deleteProject,
    exportCurrent,
    importFromFile,
    persistCurrent,
  };
}
