import { useState, useEffect, useRef, useCallback } from 'react';
import { FileTreeNavigator } from './components/FileTreeNavigator';
import { JsonEditor } from './components/JsonEditor';
import { OutputPanel } from './components/OutputPanel';
import { ErrorPanel } from './components/ErrorPanel';
import { ImportResolver } from './components/ImportResolver';
import { ThemeToggle } from './components/ThemeToggle';
import { ProjectToolbar } from './components/ProjectToolbar';
import { useProtobuf } from './hooks/useProtobuf';
import { useConversion } from './hooks/useConversion';
import { useDecode } from './hooks/useDecode';
import { useProjects } from './hooks/useProjects';
import { EXPERIMENTAL_TEXTPROTO } from './config';
import { generateDefaultMessageJson } from './utils/generateDefaultMessage';
import { saveMessageState, loadMessageState } from './utils/messageStateStorage';

const DEFAULT_JSON = `{

}`;

function App() {
  const [jsonValue, setJsonValue] = useState<string>(DEFAULT_JSON);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    root,
    selectedMessage,
    error: protoError,
    unresolvedImports,
    loadedFiles,
    mainFile,
    messageContext,
    loadProtoFile,
    loadProtoFiles,
    selectMessage,
    validateJson,
    generateJsonSchema,
    getMessageDefinition,
    clearProto,
    removeFile,
  } = useProtobuf();

  const { convert } = useConversion(root, selectedMessage);
  const { decode } = useDecode(root, selectedMessage);

  // Imperative ref so useProjects can flush the pending JSON edit before
  // switching/exporting/importing without becoming a controlled component itself.
  const flushPendingJsonRef = useRef<() => void>(() => {});
  const flushPendingJsonEdit = useCallback(() => {
    flushPendingJsonRef.current();
  }, []);

  const projectsApi = useProjects(
    { loadedFiles, mainFile, loadProtoFiles, clearProto },
    flushPendingJsonEdit
  );
  const {
    projects,
    currentProject,
    currentProjectId,
    createProject,
    switchProject,
    renameProject,
    deleteProject: deleteProjectAction,
    exportCurrent,
    importFromFile,
  } = projectsApi;

  // Load or generate JSON when selectedMessage or active project changes
  useEffect(() => {
    if (!root || !selectedMessage || !currentProjectId) return;

    const loadMessageContent = async () => {
      try {
        const savedState = await loadMessageState(currentProjectId, selectedMessage);

        if (savedState && savedState.jsonContent) {
          const validation = validateJson(savedState.jsonContent);
          if (validation.valid) {
            setJsonValue(savedState.jsonContent);
            return;
          }
          console.warn(`Saved state for ${selectedMessage} is invalid, generating defaults`);
        }

        const messageType = root.lookupType(selectedMessage);
        const defaultJson = generateDefaultMessageJson(messageType, 2);
        setJsonValue(defaultJson);
      } catch (error) {
        console.error('Error loading message content:', error);
        setJsonValue(DEFAULT_JSON);
      }
    };

    loadMessageContent();
  }, [selectedMessage, root, validateJson, currentProjectId]);

  // Validate JSON whenever it changes
  useEffect(() => {
    if (root && selectedMessage && jsonValue.trim()) {
      try {
        const result = validateJson(jsonValue);
        setValidationError(result.valid ? null : result.error || 'Validation failed');
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    } else {
      setValidationError(null);
    }
  }, [jsonValue, root, selectedMessage, validateJson]);

  // Save JSON to IndexedDB per (project, message) (with debounce)
  useEffect(() => {
    if (!selectedMessage || !jsonValue || !currentProjectId) return;

    const timeoutId = setTimeout(() => {
      saveMessageState(currentProjectId, selectedMessage, jsonValue).catch((error) => {
        console.error('Failed to save message state:', error);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [jsonValue, selectedMessage, currentProjectId]);

  // Imperative flush: write the latest jsonValue immediately. Used before
  // switching/exporting projects so we don't lose the in-flight debounced edit.
  flushPendingJsonRef.current = () => {
    if (selectedMessage && jsonValue && currentProjectId) {
      // Fire and forget — switch flow doesn't await this; the write is fast
      // and IndexedDB will serialize it before any subsequent reads.
      saveMessageState(currentProjectId, selectedMessage, jsonValue).catch(() => {});
    }
  };

  const handleLoadExample = async () => {
    const baseUrl = `${import.meta.env.BASE_URL}examples/ecommerce`;
    const filenames = ['common.proto', 'catalog.proto', 'order.proto', 'main.proto'];
    try {
      const fetched = await Promise.all(
        filenames.map(async (name) => {
          const res = await fetch(`${baseUrl}/${name}`);
          if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
          return { importPath: name, content: await res.text() };
        })
      );
      // Loading the example creates a fresh project so the user's current
      // work is never overwritten.
      await createProject('Ecommerce example');
      await loadProtoFiles(fetched, 'main.proto', 'ecommerce.api.OrderRequest');
    } catch (error) {
      console.error('Failed to load example project:', error);
    }
  };

  // Hidden input for "Add file" toolbar button.
  const addFileInputRef = useRef<HTMLInputElement | null>(null);
  const handleAddFile = () => addFileInputRef.current?.click();
  const handleImportFromFile = async (file: File) => {
    try {
      await importFromFile(file);
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  };

  const handleConvert = (format: any) => {
    return convert(jsonValue, format);
  };

  const handleDecoded = (json: string) => {
    setJsonValue(json);
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+Enter to trigger conversion
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        if (root && selectedMessage && !validationError) {
          window.dispatchEvent(new CustomEvent('triggerConversion'));
        }
      }

      // Alt+1 for Base64 format (checking both key and code for cross-platform support)
      if (event.altKey && (event.key === '1' || event.code === 'Digit1')) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('setFormat', { detail: 'base64' }));
      }

      // Alt+2 for Hex format
      if (event.altKey && (event.key === '2' || event.code === 'Digit2')) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('setFormat', { detail: 'hex' }));
      }

      // Alt+3: Binary, or ProtoText when experimental flag is on
      if (event.altKey && (event.key === '3' || event.code === 'Digit3')) {
        event.preventDefault();
        const detail = EXPERIMENTAL_TEXTPROTO ? 'textproto' : 'binary';
        window.dispatchEvent(new CustomEvent('setFormat', { detail }));
      }
      // Alt+4 for Binary when experimental textproto is on (Alt+3 is taken by it)
      if (EXPERIMENTAL_TEXTPROTO && event.altKey && (event.key === '4' || event.code === 'Digit4')) {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('setFormat', { detail: 'binary' }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [root, selectedMessage, validationError]);

  const jsonSchema = generateJsonSchema();
  const messageDefinition = getMessageDefinition();

  return (
    <div className="h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col">
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-700 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-3 pt-3">
            <ProjectToolbar
              projects={projects}
              currentProject={currentProject}
              onAddFile={handleAddFile}
              onCreateProject={() => createProject()}
              onLoadExample={handleLoadExample}
              onSwitchProject={switchProject}
              onRenameProject={renameProject}
              onDeleteProject={deleteProjectAction}
              onExportCurrent={exportCurrent}
              onImportFromFile={handleImportFromFile}
            />
            <input
              ref={addFileInputRef}
              type="file"
              accept=".proto"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadProtoFile(file);
                e.currentTarget.value = '';
              }}
            />
          </div>
          {protoError && (
            <div className="flex-shrink-0">
              <ErrorPanel error={protoError} />
            </div>
          )}

          {root && (
            <div className="flex-1 overflow-hidden">
              <FileTreeNavigator
                loadedFiles={loadedFiles}
                root={root}
                selectedMessage={selectedMessage}
                mainFile={mainFile}
                onSelectMessage={selectMessage}
                onRemoveFile={removeFile}
              />
            </div>
          )}

          {unresolvedImports.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0">
              <ImportResolver
                unresolvedImports={unresolvedImports}
                onFileSelect={(importPath, file) => loadProtoFile(file, importPath)}
                onSkip={() => {
                  console.log('Skipped unresolved imports:', unresolvedImports);
                }}
              />
            </div>
          )}
        </aside>

        {/* Center Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden z-index-{999}">
          {root && selectedMessage ? (
            <div className="flex-1 flex overflow-hidden">
              {/* JSON Editor */}
              <div className="flex-1 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-700 flex flex-col min-w-0">
                <JsonEditor
                  value={jsonValue}
                  onChange={setJsonValue}
                  schema={jsonSchema}
                  error={validationError}
                  messageContext={messageContext}
                />
              </div>

              {/* Right Panel: Output */}
              <div className="w-[420px] bg-white dark:bg-neutral-900 flex flex-col border-l border-gray-200 dark:border-neutral-700">
                <OutputPanel
                  onConvert={handleConvert}
                  onDecode={decode}
                  onDecoded={handleDecoded}
                  disabled={!root || !selectedMessage || !!validationError}
                  decodeDisabled={!root || !selectedMessage}
                  messageDefinition={messageDefinition}
                  messageName={selectedMessage}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              {!root && !protoError ? (
                <div className="max-w-md text-center">
                  <div className="w-20 h-20 bg-neutral-900 dark:bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100 mb-2">
                    Welcome to Protobuf Studio
                  </h2>
                  <p className="text-gray-600 dark:text-neutral-400 text-sm mb-5">
                    Add a .proto file to this project, or load the example to see the app in action.
                  </p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <button
                      onClick={handleAddFile}
                      className="px-4 py-2 text-sm font-medium bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-white transition-colors"
                    >
                      Add .proto file
                    </button>
                    <button
                      onClick={handleLoadExample}
                      className="px-4 py-2 text-sm font-medium bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Load example project
                    </button>
                  </div>
                  <div className="space-y-2 text-xs text-gray-500 dark:text-neutral-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-1 h-1 bg-gray-400 dark:bg-neutral-500 rounded-full"></span>
                      <span>100% Local - All processing in your browser</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-1 h-1 bg-gray-400 dark:bg-neutral-500 rounded-full"></span>
                      <span>No Server - No data sent anywhere</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-1 h-1 bg-gray-400 dark:bg-neutral-500 rounded-full"></span>
                      <span>Auto-Save - Schema & JSON preserved</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 py-2 px-4 text-xs text-gray-500 dark:text-neutral-400">
        <div className="flex items-center justify-between">
          <div>Protobuf Studio · Built with React, TypeScript & protobufjs</div>
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}

export default App;
