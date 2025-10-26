import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ProtoUploader } from './components/ProtoUploader';
import { MessageSelector } from './components/MessageSelector';
import { JsonEditor } from './components/JsonEditor';
import { OutputPanel } from './components/OutputPanel';
import { ErrorPanel } from './components/ErrorPanel';
import { useProtobuf } from './hooks/useProtobuf';
import { useConversion } from './hooks/useConversion';

const DEFAULT_JSON = `{

}`;

function App() {
  const [jsonValue, setJsonValue] = useState<string>(DEFAULT_JSON);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const {
    root,
    availableMessages,
    selectedMessage,
    error: protoError,
    loadProtoFile,
    selectMessage,
    validateJson,
    generateJsonSchema,
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

    // Load saved JSON if exists
    const savedJson = localStorage.getItem('lastJson');
    if (savedJson) {
      setJsonValue(savedJson);
    }
  }, [loadFromLocalStorage]);

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

  // Save JSON to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem('lastJson', jsonValue);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [jsonValue]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100/50 flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-6 py-8 max-w-7xl">
        {/* Proto Upload and Message Selection */}
        <div className="mb-8 space-y-5">
          <ProtoUploader
            onFileSelect={handleFileSelect}
            onClear={handleClear}
            hasFile={!!root}
            fileName={fileName}
          />

          {protoError && <ErrorPanel error={protoError} />}

          {root && (
            <MessageSelector
              messages={availableMessages}
              selectedMessage={selectedMessage}
              onSelect={selectMessage}
            />
          )}
        </div>

        {/* Main Editor and Output Area */}
        {root && selectedMessage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: JSON Editor */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 flex flex-col" style={{ height: '650px' }}>
              <JsonEditor
                value={jsonValue}
                onChange={setJsonValue}
                schema={jsonSchema}
                error={validationError}
              />
            </div>

            {/* Right Panel: Output */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 flex flex-col" style={{ height: '650px' }}>
              <OutputPanel
                onConvert={handleConvert}
                disabled={!root || !selectedMessage || !!validationError}
              />
            </div>
          </div>
        )}

        {/* Info when no proto loaded */}
        {!root && !protoError && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border-2 border-blue-200/60 rounded-2xl p-12 text-center shadow-sm">
            <div className="max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Welcome to Protobuf Studio
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Upload a .proto file to start editing and converting Protobuf messages
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                  <div className="text-blue-600 font-semibold mb-1">100% Local</div>
                  <div className="text-gray-600">All processing in your browser</div>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                  <div className="text-blue-600 font-semibold mb-1">No Server</div>
                  <div className="text-gray-600">No data sent anywhere</div>
                </div>
                <div className="bg-white/60 rounded-xl p-4 border border-blue-200/50">
                  <div className="text-blue-600 font-semibold mb-1">Auto-Save</div>
                  <div className="text-gray-600">Schema & JSON preserved</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white/80 backdrop-blur border-t border-gray-200 py-5 px-6 text-center text-sm text-gray-500">
        <p>
          Protobuf Studio · Built with React, TypeScript & protobufjs
        </p>
      </footer>
    </div>
  );
}

export default App;
