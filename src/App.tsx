import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ProtoUploader } from './components/ProtoUploader';
import { MessageSelector } from './components/MessageSelector';
import { JsonEditor } from './components/JsonEditor';
import { OutputPanel } from './components/OutputPanel';
import { ErrorPanel } from './components/ErrorPanel';
import { ImportResolver } from './components/ImportResolver';
import { useProtobuf } from './hooks/useProtobuf';
import { useConversion } from './hooks/useConversion';
import { generateDefaultMessageJson } from './utils/generateDefaultMessage';
import { saveMessageState, loadMessageState } from './utils/messageStateStorage';

const DEFAULT_JSON = `{

}`;

function App() {
  const [jsonValue, setJsonValue] = useState<string>(DEFAULT_JSON);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const isInitialMount = useRef(true);

  const {
    root,
    availableMessages,
    selectedMessage,
    error: protoError,
    unresolvedImports,
    loadProtoFile,
    selectMessage,
    validateJson,
    generateJsonSchema,
    getMessageDefinition,
    clearProto,
    loadFromLocalStorage,
  } = useProtobuf();

  const { convert } = useConversion(root, selectedMessage);

  // Load saved proto on mount
  useEffect(() => {
    loadFromLocalStorage();
    const savedFileName = localStorage.getItem('lastFileName');
    if (savedFileName) {
      setFileName(savedFileName);
    }
  }, [loadFromLocalStorage]);

  // Load or generate JSON when selectedMessage changes
  useEffect(() => {
    if (!root || !selectedMessage) return;

    const loadMessageContent = async () => {
      try {
        // Try to load saved state for this message
        const savedState = await loadMessageState(selectedMessage);

        if (savedState && savedState.jsonContent) {
          // Validate saved content
          const validation = validateJson(savedState.jsonContent);

          if (validation.valid) {
            // Use saved content if valid
            setJsonValue(savedState.jsonContent);
            return;
          } else {
            console.warn(`Saved state for ${selectedMessage} is invalid, generating defaults`);
          }
        }

        // No saved state or invalid - generate default message
        const messageType = root.lookupType(selectedMessage);
        const defaultJson = generateDefaultMessageJson(messageType, 2);
        setJsonValue(defaultJson);
      } catch (error) {
        console.error('Error loading message content:', error);
        // Fallback to default JSON
        setJsonValue(DEFAULT_JSON);
      }
    };

    // Skip loading on initial mount if we're restoring from old localStorage
    if (isInitialMount.current) {
      const oldSavedJson = localStorage.getItem('lastJson');
      if (oldSavedJson) {
        // Use old saved JSON for first load, then migrate to new system
        setJsonValue(oldSavedJson);
        isInitialMount.current = false;
        return;
      }
    }

    loadMessageContent();
  }, [selectedMessage, root, validateJson]);

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

  // Save JSON to IndexedDB per message type (with debounce)
  useEffect(() => {
    if (!selectedMessage || !jsonValue) return;

    const timeoutId = setTimeout(() => {
      saveMessageState(selectedMessage, jsonValue).catch((error) => {
        console.error('Failed to save message state:', error);
      });

      // Also save to old localStorage for backward compatibility (migration period)
      localStorage.setItem('lastJson', jsonValue);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [jsonValue, selectedMessage]);

  const handleFileSelect = async (file: File) => {
    await loadProtoFile(file);
    setFileName(file.name);
  };

  const handleClear = () => {
    clearProto();
    setFileName('');
    setJsonValue(DEFAULT_JSON);
    setValidationError(null);
  };

  const handleConvert = (format: any) => {
    return convert(jsonValue, format);
  };

  const jsonSchema = generateJsonSchema();
  const messageDefinition = getMessageDefinition();

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <Header />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
          <div className="p-3 space-y-3">
            <ProtoUploader
              onFileSelect={handleFileSelect}
              onClear={handleClear}
              hasFile={!!root}
              fileName={fileName}
            />

            {protoError && <ErrorPanel error={protoError} />}

            {unresolvedImports.length > 0 && (
              <ImportResolver
                unresolvedImports={unresolvedImports}
                onFileSelect={(importPath, file) => loadProtoFile(file, importPath)}
                onSkip={() => {
                  console.log('Skipped unresolved imports:', unresolvedImports);
                }}
              />
            )}

            {root && (
              <MessageSelector
                messages={availableMessages}
                selectedMessage={selectedMessage}
                onSelect={selectMessage}
              />
            )}
          </div>
        </aside>

        {/* Center Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {root && selectedMessage ? (
            <div className="flex-1 flex overflow-hidden">
              {/* JSON Editor */}
              <div className="flex-1 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col min-w-0">
                <JsonEditor
                  value={jsonValue}
                  onChange={setJsonValue}
                  schema={jsonSchema}
                  error={validationError}
                />
              </div>

              {/* Right Panel: Output */}
              <div className="w-[560px] bg-white dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-700">
                <OutputPanel
                  onConvert={handleConvert}
                  disabled={!root || !selectedMessage || !!validationError}
                  messageDefinition={messageDefinition}
                  messageName={selectedMessage}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              {!root && !protoError ? (
                <div className="max-w-md text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Welcome to Protobuf Studio
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Upload a .proto file to start editing and converting Protobuf messages
                  </p>
                  <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>100% Local - All processing in your browser</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      <span>No Server - No data sent anywhere</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      <span>Auto-Save - Schema & JSON preserved</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-2 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
        Protobuf Studio · Built with React, TypeScript & protobufjs
      </footer>
    </div>
  );
}

export default App;
