import { FileCode2 } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700">
      <div className="px-4 py-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
            <FileCode2 size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-neutral-100">Protobuf Studio</h1>
        </div>
      </div>
    </header>
  );
};