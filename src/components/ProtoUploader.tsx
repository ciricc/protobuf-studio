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
    <div className="flex gap-3 items-center">
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
          className="flex-1 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <Upload className="text-gray-400 group-hover:text-blue-500 transition-colors" size={28} />
            </div>
            <p className="text-sm text-gray-700 mb-1">
              <span className="font-semibold text-blue-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">.proto files only</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg">
            <FileCode2 className="text-green-600" size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{fileName || 'Schema loaded'}</p>
            <p className="text-xs text-green-600 mt-0.5">Ready to use</p>
          </div>
          <button
            onClick={onClear}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors text-gray-400 hover:text-red-600"
            title="Clear schema"
          >
            <X size={18} />
          </button>
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