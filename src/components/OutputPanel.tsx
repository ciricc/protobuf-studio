import { useState } from 'react';
import { Copy, Download, Play } from 'lucide-react';
import type { OutputFormat, ConversionResult } from '../types/proto';

interface OutputPanelProps {
  onConvert: (format: OutputFormat) => ConversionResult;
  disabled?: boolean;
}

export const OutputPanel = ({ onConvert, disabled }: OutputPanelProps) => {
  const [selectedFormat, setSelectedFormat] = useState<OutputFormat>('base64');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const formats: { value: OutputFormat; label: string }[] = [
    { value: 'binary', label: 'Binary' },
    { value: 'base64', label: 'Base64' },
    { value: 'hex', label: 'Hex' },
    { value: 'json', label: 'JSON' },
    { value: 'textproto', label: 'TextProto' },
  ];

  const handleConvert = () => {
    const conversionResult = onConvert(selectedFormat);
    setResult(conversionResult);
    setCopied(false);
  };

  const getOutputValue = (): string => {
    if (!result) return '';
    if (result.error) return `Error: ${result.error}`;

    switch (selectedFormat) {
      case 'binary':
        return result.binary
          ? `Uint8Array(${result.binary.length}) [${Array.from(result.binary.slice(0, 50)).join(', ')}${result.binary.length > 50 ? '...' : ''}]`
          : '';
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
      case 'binary':
        if (result.binary) {
          blob = new Blob([result.binary as BlobPart], { type: 'application/octet-stream' });
          filename = 'output.bin';
        } else return;
        break;
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
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Output Format
        </label>
        <div className="flex gap-2 flex-wrap">
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={() => {
                setSelectedFormat(format.value);
                setResult(null);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                selectedFormat === format.value
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {format.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={handleConvert}
          disabled={disabled}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all font-semibold text-sm shadow-lg shadow-green-600/20 disabled:shadow-none"
        >
          <Play size={16} />
          Convert
        </button>
        <button
          onClick={handleCopy}
          disabled={!result || !!result.error}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all text-sm font-medium"
          title="Copy to clipboard"
        >
          <Copy size={16} />
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!result || !!result.error}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:border-gray-300 hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed transition-all text-sm font-medium"
          title="Download file"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      <div className="flex-1 flex flex-col">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Output
        </label>
        <div
          className={`flex-1 border-2 rounded-xl p-4 font-mono text-sm overflow-auto ${
            result?.error
              ? 'bg-red-50/50 border-red-200'
              : 'bg-gray-50/50 border-gray-200'
          }`}
        >
          {result ? (
            <pre className="whitespace-pre-wrap break-all text-gray-800">
              {getOutputValue()}
            </pre>
          ) : (
            <p className="text-gray-400 italic text-center pt-8">
              Click "Convert" to generate output
            </p>
          )}
        </div>
      </div>
    </div>
  );
};