import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, FolderPlus, FolderOpen, Download, Pencil, Trash2, Check, Sparkles } from 'lucide-react';
import type { ProjectMeta } from '../types/project';

interface ProjectToolbarProps {
  projects: ProjectMeta[];
  currentProject: ProjectMeta | null;
  onAddFile: () => void;
  onCreateProject: () => void;
  onLoadExample: () => void;
  onSwitchProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onExportCurrent: () => void;
  onImportFromFile: (file: File) => void;
}

export const ProjectToolbar = ({
  projects,
  currentProject,
  onAddFile,
  onCreateProject,
  onLoadExample,
  onSwitchProject,
  onRenameProject,
  onDeleteProject,
  onExportCurrent,
  onImportFromFile,
}: ProjectToolbarProps) => {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setRenaming(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setRenaming(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (renaming) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renaming]);

  const startRename = () => {
    if (!currentProject) return;
    setRenameValue(currentProject.name);
    setRenaming(true);
  };

  const commitRename = () => {
    if (!currentProject) return;
    const next = renameValue.trim();
    if (next && next !== currentProject.name) {
      onRenameProject(currentProject.id, next);
    }
    setRenaming(false);
  };

  const handleDelete = () => {
    if (!currentProject) return;
    if (confirm(`Delete project "${currentProject.name}"? This removes its files and saved JSON edits.`)) {
      onDeleteProject(currentProject.id);
      setOpen(false);
    }
  };

  const otherProjects = projects.filter((p) => p.id !== currentProject?.id);

  return (
    <div ref={wrapperRef} className="flex gap-1.5">
      {/* Project dropdown */}
      <div className="relative flex-1 min-w-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 text-sm font-medium bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors text-gray-800 dark:text-neutral-200"
          title={currentProject?.name ?? 'No project'}
        >
          <span className="truncate">{currentProject?.name ?? '(no project)'}</span>
          <ChevronDown size={14} className="flex-shrink-0 text-gray-500 dark:text-neutral-400" />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden text-sm">
            {/* Current project header */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-neutral-800">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-1">
                Current
              </div>
              {renaming ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenaming(false);
                    }}
                    className="flex-1 px-2 py-1 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500"
                  />
                  <button
                    onClick={commitRename}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-neutral-400"
                    title="Save"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-neutral-100 truncate">
                    {currentProject?.name ?? '(none)'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={startRename}
                      disabled={!currentProject}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500 dark:text-neutral-400 disabled:opacity-30"
                      title="Rename"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={!currentProject}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-30"
                      title="Delete project"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Switch list */}
            {otherProjects.length > 0 && (
              <div className="py-1 border-b border-gray-100 dark:border-neutral-800 max-h-48 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wide text-gray-500 dark:text-neutral-400">
                  Switch to
                </div>
                {otherProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSwitchProject(p.id);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                  >
                    <FolderOpen size={13} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => {
                  onCreateProject();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                <FolderPlus size={13} className="text-gray-400" />
                New project
              </button>
              <button
                onClick={() => {
                  onLoadExample();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                <Sparkles size={13} className="text-gray-400" />
                Load example project
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                <FolderOpen size={13} className="text-gray-400" />
                Open from file…
              </button>
              <button
                onClick={() => {
                  onExportCurrent();
                  setOpen(false);
                }}
                disabled={!currentProject}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download size={13} className="text-gray-400" />
                Export current
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add file button */}
      <button
        onClick={onAddFile}
        disabled={!currentProject}
        className="flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600 transition-colors text-gray-700 dark:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        title="Add a .proto file to the current project"
      >
        <Plus size={14} />
        Add file
      </button>

      {/* Hidden import input */}
      <input
        ref={importInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportFromFile(file);
            setOpen(false);
          }
          e.currentTarget.value = '';
        }}
      />
    </div>
  );
};
