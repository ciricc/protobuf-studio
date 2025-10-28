import { useState, useRef, useEffect } from 'react';
import { Copy, Download, Play } from 'lucide-react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { OutputFormat, ConversionResult } from '../types/proto';
import { MessageDefinition } from './MessageDefinition';
import { prototextLanguageConfiguration, prototextMonarchLanguage } from '../utils/prototextLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { registerCustomTheme } from '../utils/monacoTheme';

type TabType = 'output' | 'schema';

interface OutputPanelProps {
  onConvert: (format: OutputFormat) => ConversionResult;
  disabled?: boolean;
  messageDefinition?: string | null;
  messageName?: string | null;
}

export const OutputPanel = ({ onConvert, disabled, messageDefinition, messageName }: OutputPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('output');
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('base64');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);
  const { theme } = useTheme();

  // Reset conversion result when message type changes
  useEffect(() => {
    setResult(null);
    setCopied(false);
  }, [messageName]);

  const formats: { value: OutputFormat; label: string }[] = [
    { value: 'base64', label: 'Base64' },
    { value: 'hex', label: 'Hex' },
    { value: 'json', label: 'JSON' },
    { value: 'textproto', label: 'ProtoText' },
  ];

  const handleEditorWillMount = (monaco: Monaco) => {
    // Register custom dark theme
    registerCustomTheme(monaco);

    // Set initial theme based on current app theme
    monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');

    // Register prototext language only once
    if (!isLanguageRegistered) {
      // Check if language is already registered
      const languages = monaco.languages.getLanguages();
      const isProtoTextRegistered = languages.some((lang) => lang.id === 'prototext');

      if (!isProtoTextRegistered) {
        // Register the language
        monaco.languages.register({ id: 'prototext' });

        // Set language configuration
        monaco.languages.setLanguageConfiguration('prototext', prototextLanguageConfiguration);

        // Set monarch tokenizer
        monaco.languages.setMonarchTokensProvider('prototext', prototextMonarchLanguage);
      }

      setIsLanguageRegistered(true);
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  // Update Monaco Editor theme when app theme changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');
      }
    }
  }, [theme]);

  const handleConvert = () => {
    const conversionResult = onConvert(selectedFormat);
    setResult(conversionResult);
    setCopied(false);
  };

  const getLanguageForFormat = (): string => {
    switch (selectedFormat) {
      case 'json':
        return 'json';
      case 'textproto':
        return 'prototext';
      default:
        return 'plaintext';
    }
  };

  const shouldUseMonaco = (): boolean => {
    return selectedFormat === 'json' || selectedFormat === 'textproto';
  };

  const getOutputValue = (): string => {
    if (!result) return '';
    if (result.error) return `Error: ${result.error}`;

    switch (selectedFormat) {
      case 'base64':
        return result.base64 || '';
      case 'hex':
        return result.hex || '';
      case 'json':
        return result.json || '';
      case 'textproto':
        return result.textproto || '';
      default:
        return '';
    }
  };

  const handleCopy = async () => {
    const value = getOutputValue();
    if (value && !result?.error) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleDownload = () => {
    if (!result || result.error) return;

    let blob: Blob;
    let filename: string;

    switch (selectedFormat) {
      case 'base64':
        blob = new Blob([result.base64 || ''], { type: 'text/plain' });
        filename = 'output.base64.txt';
        break;
      case 'hex':
        blob = new Blob([result.hex || ''], { type: 'text/plain' });
        filename = 'output.hex.txt';
        break;
      case 'json':
        blob = new Blob([result.json || ''], { type: 'application/json' });
        filename = 'output.json';
        break;
      case 'textproto':
        blob = new Blob([result.textproto || ''], { type: 'text/plain' });
        filename = 'output.textproto';
        break;
      default:
        return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
        <button
          onClick={() => setActiveTab('output')}
          className={`px-4 py-2 text-sm font-semibold transition-all rounded-t border-b-2 -mb-[1px] ${
            activeTab === 'output'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
              : 'text-gray-500 dark:text-neutral-400 border-transparent hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
          }`}
        >
          Output
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-4 py-2 text-sm font-semibold transition-all rounded-t border-b-2 -mb-[1px] ${
            activeTab === 'schema'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
              : 'text-gray-500 dark:text-neutral-400 border-transparent hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
          }`}
        >
          Schema
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'output' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 space-y-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
            {/* Output Format Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">
                Output Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {formats.map((format) => (
                  <label
                    key={format.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedFormat === format.value
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-gray-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={format.value}
                      checked={selectedFormat === format.value}
                      onChange={() => {
                        setSelectedFormat(format.value);
                        setResult(null);
                      }}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
                    />
                    <span
                      className={`text-sm font-medium ${
                        selectedFormat === format.value
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-neutral-300'
                      }`}
                    >
                      {format.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">
                Actions
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleConvert}
                  disabled={disabled}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-sm"
                >
                  <Play size={16} />
                  Convert
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!result || !!result.error}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:text-gray-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  title="Copy to clipboard"
                >
                  <Copy size={16} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!result || !!result.error}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:text-gray-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  title="Download file"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">
              Result
            </label>
            <div
              className={`flex-1 border rounded overflow-hidden ${
                result?.error
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700'
              }`}
            >
              {result ? (
                result.error ? (
                  <div className="p-3 font-mono text-sm">
                    <pre className="whitespace-pre-wrap break-all text-gray-800 dark:text-neutral-200">
                      {getOutputValue()}
                    </pre>
                  </div>
                ) : shouldUseMonaco() ? (
                  <Editor
                    value={getOutputValue()}
                    language={getLanguageForFormat()}
                    theme={theme === 'dark' ? 'gruvbox-dark-hard' : 'vs'}
                    beforeMount={handleEditorWillMount}
                    onMount={handleEditorDidMount}
                    options={{
                      readOnly: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 13,
                      lineNumbers: 'on',
                      renderLineHighlight: 'none',
                      scrollbar: {
                        vertical: 'auto',
                        horizontal: 'auto',
                        useShadows: false,
                        verticalScrollbarSize: 10,
                        horizontalScrollbarSize: 10,
                      },
                      overviewRulerLanes: 0,
                      hideCursorInOverviewRuler: true,
                      overviewRulerBorder: false,
                      wordWrap: 'on',
                      wrappingStrategy: 'advanced',
                      fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', 'Courier New', monospace",
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                ) : (
                  <div className="p-3 font-mono text-sm overflow-auto h-full">
                    <pre className="whitespace-pre-wrap break-all text-gray-800 dark:text-neutral-200">
                      {getOutputValue()}
                    </pre>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 dark:text-neutral-500 italic text-center pt-8 text-sm">
                    Click "Convert" to generate output
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <MessageDefinition definition={messageDefinition || null} messageName={messageName || null} />
      )}
    </div>
  );
};
