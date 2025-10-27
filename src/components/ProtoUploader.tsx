import { useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ProtoUploaderProps {
  onFileSelect: (file: File) => void;
  onClear: () => void;
  hasFile: boolean;
  fileName?: string;
}

export const ProtoUploader = ({ onFileSelect, onClear, hasFile, fileName }: ProtoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.proto')) {
      onFileSelect(file);
    } else if (file) {
      alert('Please select a .proto file');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.proto')) {
      onFileSelect(file);
    } else if (file) {
      alert('Please drop a .proto file');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".proto"
        onChange={handleFileChange}
        className="hidden"
      />

      {!hasFile ? (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <Upload className="text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" size={18} />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Upload</span> .proto
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900/40 rounded">
              <FileCode2 className="text-green-600 dark:text-green-400" size={14} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{fileName || 'Schema'}</p>
            </div>
            <button
              onClick={onClear}
              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
              title="Clear"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FileCode2 = ({ className, size }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="m10 13-2 2 2 2" />
    <path d="m14 17 2-2-2-2" />
  </svg>
);