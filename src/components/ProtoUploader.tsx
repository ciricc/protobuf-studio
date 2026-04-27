import { useRef } from 'react';
import { Upload, Sparkles } from 'lucide-react';

interface ProtoUploaderProps {
  onFileSelect: (file: File) => void;
  onLoadExample?: () => void;
  hasFile?: boolean;
}

export const ProtoUploader = ({ onFileSelect, onLoadExample, hasFile }: ProtoUploaderProps) => {
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

  // Don't render if file is already selected
  if (hasFile) {
    return null;
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".proto"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="m-3 space-y-2">
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border border-dashed border-gray-300 dark:border-neutral-600 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
        >
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 bg-gray-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <Upload className="text-gray-400 dark:text-neutral-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" size={18} />
            </div>
            <p className="text-sm text-gray-700 dark:text-neutral-300 mb-1">
              <span className="font-semibold text-blue-600 dark:text-blue-400">Upload</span> .proto
            </p>
          </div>
        </div>

        {onLoadExample && (
          <button
            onClick={onLoadExample}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs text-gray-600 dark:text-neutral-400 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-700 hover:text-gray-800 dark:hover:text-neutral-200 transition-colors"
            title="Load a sample e-commerce schema with imports, enums, oneof, maps and Timestamp"
          >
            <Sparkles size={12} />
            Load example project
          </button>
        )}
      </div>
    </div>
  );
};