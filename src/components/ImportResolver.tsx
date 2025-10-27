import React, { useState } from 'react';

interface ImportResolverProps {
  unresolvedImports: string[];
  onFileSelect: (importPath: string, file: File) => void;
  onSkip: () => void;
}

export const ImportResolver: React.FC<ImportResolverProps> = ({
  unresolvedImports,
  onFileSelect,
}) => {
  const [resolvedImports, setResolvedImports] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleFileChange = (importPath: string, file: File) => {
    onFileSelect(importPath, file);
    setResolvedImports((prev) => new Set(prev).add(importPath));
  };

  if (unresolvedImports.length === 0) return null;

  const unresolvedCount = unresolvedImports.length;
  const resolvedCount = resolvedImports.size;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2">
      <div className="flex items-start gap-1.5">
        <svg
          className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Unresolved imports ({resolvedCount}/{unresolvedCount})
            </h3>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-0.5"
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-2 mt-2">
            {unresolvedImports.map((importPath) => (
              <div
                key={importPath}
                className={`rounded ${resolvedImports.has(importPath)
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800'
                  : 'border-2 border-dashed border-yellow-400 dark:border-yellow-600 bg-yellow-50/30 dark:bg-yellow-900/20'
                  }`}
              >
                {resolvedImports.has(importPath) ? (
                  <div className="p-2 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <code className="text-xs font-mono text-green-800 dark:text-green-300 break-all">
                        {importPath}
                      </code>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block p-2 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 transition-all rounded">
                    <input
                      type="file"
                      accept=".proto"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.name.endsWith('.proto')) {
                            handleFileChange(importPath, file);
                          } else {
                            alert('Пожалуйста, выберите .proto файл');
                          }
                        }
                      }}
                    />
                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {importPath}
                    </code>
                  </label>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
