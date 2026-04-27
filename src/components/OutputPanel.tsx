import { useState, useRef, useEffect } from 'react';
import { Copy, Download, Play, Upload, AlertTriangle } from 'lucide-react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { OutputFormat, ConversionResult } from '../types/proto';
import type { DecodeFormat, DecodeResult } from '../hooks/useDecode';
import { MessageDefinition } from './MessageDefinition';
import { prototextLanguageConfiguration, prototextMonarchLanguage } from '../utils/prototextLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { registerCustomTheme } from '../utils/monacoTheme';
import { EXPERIMENTAL_TEXTPROTO } from '../config';

type TabType = 'output' | 'schema';
type Mode = 'encode' | 'decode';

interface OutputPanelProps {
  onConvert: (format: OutputFormat) => ConversionResult;
  onDecode: (input: string | Uint8Array, format: DecodeFormat) => DecodeResult;
  onDecoded: (json: string) => void;
  disabled?: boolean;
  decodeDisabled?: boolean;
  messageDefinition?: string | null;
  messageName?: string | null;
}

const ENCODE_FORMATS: { value: OutputFormat; label: string; experimental?: boolean }[] = [
  { value: 'base64', label: 'Base64' },
  { value: 'hex', label: 'Hex' },
  { value: 'binary', label: 'Binary' },
  ...(EXPERIMENTAL_TEXTPROTO
    ? [{ value: 'textproto' as OutputFormat, label: 'ProtoText', experimental: true }]
    : []),
];

const DECODE_FORMATS: { value: DecodeFormat; label: string }[] = [
  { value: 'base64', label: 'Base64' },
  { value: 'hex', label: 'Hex' },
];

export const OutputPanel = ({
  onConvert,
  onDecode,
  onDecoded,
  disabled,
  decodeDisabled,
  messageDefinition,
  messageName,
}: OutputPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('output');
  const [mode, setMode] = useState<Mode>('encode');

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
        <button
          onClick={() => setActiveTab('output')}
          className={`px-3 py-2 text-sm font-medium transition-colors rounded-t border-b-2 -mb-[1px] ${
            activeTab === 'output'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
              : 'text-gray-500 dark:text-neutral-400 border-transparent hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
          }`}
        >
          Output
        </button>
        <button
          onClick={() => setActiveTab('schema')}
          className={`px-3 py-2 text-sm font-medium transition-colors rounded-t border-b-2 -mb-[1px] ${
            activeTab === 'schema'
              ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
              : 'text-gray-500 dark:text-neutral-400 border-transparent hover:text-gray-700 dark:hover:text-neutral-200 hover:bg-gray-100 dark:hover:bg-neutral-700'
          }`}
        >
          Schema
        </button>
      </div>

      {activeTab === 'output' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mode toggle */}
          <div className="px-3 pt-3 pb-2 bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
            <div className="grid grid-cols-2 gap-1 p-1 bg-gray-200 dark:bg-neutral-900 rounded-md">
              <button
                onClick={() => setMode('encode')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  mode === 'encode'
                    ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 shadow-sm'
                    : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200'
                }`}
              >
                Encode →
              </button>
              <button
                onClick={() => setMode('decode')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  mode === 'decode'
                    ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 shadow-sm'
                    : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200'
                }`}
              >
                ← Decode
              </button>
            </div>
          </div>

          {mode === 'encode' ? (
            <EncodeView
              onConvert={onConvert}
              disabled={disabled}
              messageName={messageName}
            />
          ) : (
            <DecodeView
              onDecode={onDecode}
              onDecoded={onDecoded}
              disabled={decodeDisabled}
              messageName={messageName}
            />
          )}
        </div>
      ) : (
        <MessageDefinition definition={messageDefinition || null} messageName={messageName || null} />
      )}
    </div>
  );
};

// ─────────────────────────── Encode ───────────────────────────

interface EncodeViewProps {
  onConvert: (format: OutputFormat) => ConversionResult;
  disabled?: boolean;
  messageName?: string | null;
}

const EncodeView = ({ onConvert, disabled, messageName }: EncodeViewProps) => {
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('base64');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setResult(null);
    setCopied(false);
  }, [messageName]);

  const handleConvert = () => {
    const conversionResult = onConvert(selectedFormat);
    setResult(conversionResult);
    setCopied(false);
  };

  useEffect(() => {
    const handleGlobalConversion = () => {
      if (!disabled) handleConvert();
    };
    const handleSetFormat = (event: Event) => {
      const customEvent = event as CustomEvent;
      const format = customEvent.detail as OutputFormat;
      if (ENCODE_FORMATS.some((f) => f.value === format)) {
        setSelectedFormat(format);
        setResult(null);
      }
    };
    window.addEventListener('triggerConversion', handleGlobalConversion);
    window.addEventListener('setFormat', handleSetFormat as EventListener);
    return () => {
      window.removeEventListener('triggerConversion', handleGlobalConversion);
      window.removeEventListener('setFormat', handleSetFormat as EventListener);
    };
  }, [disabled, selectedFormat, onConvert]);

  const handleEditorWillMount = (monaco: Monaco) => {
    registerCustomTheme(monaco);
    monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');
    if (!isLanguageRegistered) {
      const languages = monaco.languages.getLanguages();
      if (!languages.some((lang) => lang.id === 'prototext')) {
        monaco.languages.register({ id: 'prototext' });
        monaco.languages.setLanguageConfiguration('prototext', prototextLanguageConfiguration);
        monaco.languages.setMonarchTokensProvider('prototext', prototextMonarchLanguage);
      }
      setIsLanguageRegistered(true);
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');
      }
    }
  }, [theme]);

  const getLanguageForFormat = (): string =>
    selectedFormat === 'textproto' ? 'prototext' : 'plaintext';

  const shouldUseMonaco = (): boolean => selectedFormat === 'textproto';

  const getOutputValue = (): string => {
    if (!result) return '';
    if (result.error) return `Error: ${result.error}`;
    switch (selectedFormat) {
      case 'base64':
        return result.base64 || '';
      case 'hex':
        return result.hex || '';
      case 'textproto':
        return result.textproto || '';
      case 'binary': {
        const buf = result.binary;
        if (!buf) return '';
        const previewLen = Math.min(buf.length, 64);
        const hex = Array.from(buf.slice(0, previewLen))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        const suffix = buf.length > previewLen ? `\n…${buf.length - previewLen} more bytes` : '';
        return `${buf.length} bytes\n\n${hex}${suffix}`;
      }
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
      case 'textproto':
        blob = new Blob([result.textproto || ''], { type: 'text/plain' });
        filename = 'output.textproto';
        break;
      case 'binary': {
        if (!result.binary) return;
        // Copy into a fresh ArrayBuffer so the Blob constructor accepts it under strict TS lib types
        const ab = new ArrayBuffer(result.binary.byteLength);
        new Uint8Array(ab).set(result.binary);
        blob = new Blob([ab], { type: 'application/octet-stream' });
        filename = 'output.bin';
        break;
      }
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-3 space-y-3 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
        {/* Format selector */}
        <div>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
            Format
          </div>
          <div className="flex gap-0.5 p-0.5 bg-gray-200 dark:bg-neutral-900 rounded">
            {ENCODE_FORMATS.map((format) => (
              <button
                key={format.value}
                onClick={() => {
                  setSelectedFormat(format.value);
                  setResult(null);
                }}
                title={format.experimental ? 'Experimental — encode-only, not roundtrip-verified' : undefined}
                className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                  selectedFormat === format.value
                    ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 shadow-sm'
                    : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200'
                }`}
              >
                {format.label}
                {format.experimental && (
                  <span className="ml-0.5 text-amber-600 dark:text-amber-400">⚠</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Primary action — Convert. Secondary buttons sit beside it. */}
        <div className="flex gap-1.5">
          <button
            onClick={handleConvert}
            disabled={disabled}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-500 dark:bg-blue-500/90 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          >
            <Play size={14} />
            Convert
          </button>
          <button
            onClick={handleCopy}
            disabled={!result || !!result.error || selectedFormat === 'binary'}
            className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={selectedFormat === 'binary' ? 'Binary cannot be copied to clipboard — use Download' : 'Copy to clipboard'}
          >
            <Copy size={13} />
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!result || !!result.error}
            className="flex items-center justify-center px-2.5 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Download file"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-3">
        <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
          Result
        </div>
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
  );
};

// ─────────────────────────── Decode ───────────────────────────

interface DecodeViewProps {
  onDecode: (input: string | Uint8Array, format: DecodeFormat) => DecodeResult;
  onDecoded: (json: string) => void;
  disabled?: boolean;
  messageName?: string | null;
}

const BINARY_EXTENSIONS = ['bin', 'pb', 'proto-bin', 'binpb'];
const TEXT_EXTENSIONS = ['txt', 'b64', 'base64', 'hex'];

const DecodeView = ({ onDecode, onDecoded, disabled, messageName }: DecodeViewProps) => {
  const [selectedFormat, setSelectedFormat] = useState<DecodeFormat>('base64');
  const [input, setInput] = useState<string>('');
  const [binaryInput, setBinaryInput] = useState<Uint8Array | null>(null);
  const [binaryFileName, setBinaryFileName] = useState<string | null>(null);
  const [decodeError, setDecodeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setInput('');
    setBinaryInput(null);
    setBinaryFileName(null);
    setDecodeError(null);
  }, [messageName]);

  const handleSetFormat = (format: DecodeFormat) => {
    setSelectedFormat(format);
    if (binaryInput) {
      setBinaryInput(null);
      setBinaryFileName(null);
    }
    setDecodeError(null);
  };

  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent).detail as string;
      if (detail === 'base64' || detail === 'hex') {
        handleSetFormat(detail);
      }
    };
    window.addEventListener('setFormat', listener as EventListener);
    return () => window.removeEventListener('setFormat', listener as EventListener);
  }, []);

  const handleDecode = () => {
    setDecodeError(null);
    const bytes = binaryInput ?? (input.trim() ? input : null);
    if (bytes === null) {
      setDecodeError('Provide input via paste or file upload');
      return;
    }
    const result = onDecode(bytes, binaryInput ? 'binary' : selectedFormat);
    if (result.error) {
      setDecodeError(result.error);
      return;
    }
    if (result.json !== undefined) {
      onDecoded(result.json);
    }
  };

  const handleFile = async (file: File) => {
    setDecodeError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (BINARY_EXTENSIONS.includes(ext) || ext === '') {
      const buf = await file.arrayBuffer();
      setBinaryInput(new Uint8Array(buf));
      setBinaryFileName(file.name);
      setInput('');
    } else if (TEXT_EXTENSIONS.includes(ext) || /\.(txt|hex|b64|base64)$/i.test(file.name)) {
      const text = await file.text();
      setInput(text.trim());
      setBinaryInput(null);
      setBinaryFileName(null);
    } else {
      // Unknown — treat as binary, safer default for protobuf payloads.
      const buf = await file.arrayBuffer();
      setBinaryInput(new Uint8Array(buf));
      setBinaryFileName(file.name);
      setInput('');
    }
  };

  const handleClearFile = () => {
    setBinaryInput(null);
    setBinaryFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-3 space-y-3 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
        {/* Format selector */}
        <div>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
            Input format
          </div>
          <div className="flex gap-0.5 p-0.5 bg-gray-200 dark:bg-neutral-900 rounded">
            {DECODE_FORMATS.map((format) => {
              const isActive = selectedFormat === format.value && !binaryInput;
              return (
                <button
                  key={format.value}
                  onClick={() => handleSetFormat(format.value)}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 shadow-sm'
                      : 'text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-200'
                  }`}
                >
                  {format.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input area */}
        <div>
          <div className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 dark:text-neutral-400 mb-1.5">
            Input
          </div>
          <div className="space-y-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 rounded hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              title="Upload file (.bin treated as raw binary, .txt/.hex/.b64 as text)"
            >
              <Upload size={13} />
              Upload file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {binaryFileName ? (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded text-xs text-gray-600 dark:text-neutral-400">
                <span className="truncate" title={binaryFileName}>
                  {binaryFileName} · {binaryInput?.length ?? 0} bytes
                </span>
                <button
                  onClick={handleClearFile}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-neutral-200 flex-shrink-0"
                  title="Clear file"
                >
                  ×
                </button>
              </div>
            ) : (
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setDecodeError(null);
                }}
                placeholder={
                  selectedFormat === 'base64'
                    ? 'Paste Base64 string (e.g. CgVIZWxsbw==)'
                    : 'Paste hex string (e.g. 0a0548656c6c6f)'
                }
                spellCheck={false}
                className="w-full h-24 px-2.5 py-1.5 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded text-sm font-mono text-gray-800 dark:text-neutral-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            )}
          </div>
        </div>

        {/* Primary action */}
        <button
          onClick={handleDecode}
          disabled={disabled}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-500 dark:bg-blue-500/90 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
          title="Decode and replace JSON in the editor"
        >
          <Play size={14} />
          Decode
        </button>
        {disabled && (
          <p className="text-xs text-gray-500 dark:text-neutral-400">
            Select a message type in the file tree first.
          </p>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-auto p-3 space-y-3">
        {decodeError ? (
          <div className="p-2.5 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <pre className="text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {decodeError}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-neutral-500 italic text-center pt-4">
            Decoded JSON will replace the editor on the left.
          </p>
        )}
      </div>
    </div>
  );
};
