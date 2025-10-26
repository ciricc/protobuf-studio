import { FileCode2 } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
            <FileCode2 size={24} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Protobuf Studio</h1>
            <p className="text-sm text-gray-500 mt-0.5">Edit, validate & serialize Protobuf messages locally</p>
          </div>
        </div>
      </div>
    </header>
  );
};