import { FileCode2 } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Header = () => {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-sm">
              <FileCode2 size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100">Protobuf Studio</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Edit, validate & serialize messages</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};