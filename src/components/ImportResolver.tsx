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
    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-semibold text-yellow-900">
              Обнаружены неразрешенные импорты ({resolvedCount}/{unresolvedCount} загружено)
            </h3>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-yellow-800 hover:text-yellow-900 transition-colors p-1"
              title={isCollapsed ? 'Развернуть' : 'Свернуть'}
            >
              <svg
                className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
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
          {!isCollapsed && (
            <p className="text-sm text-yellow-800">
              Пожалуйста, загрузите недостающие .proto файлы для корректной работы:
            </p>
          )}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div className="space-y-3 my-4">
            {unresolvedImports.map((importPath) => (
              <div
                key={importPath}
                className="flex items-center gap-3 bg-white p-3 rounded border border-yellow-200"
              >
                <div className="flex-1">
                  <code className="text-sm font-mono text-gray-800 break-all">
                    {importPath}
                  </code>
                </div>

                {resolvedImports.has(importPath) ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Загружен
                  </div>
                ) : (
                  <label className="cursor-pointer">
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
                    <span className="inline-flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-600 transition-colors">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                        <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                      </svg>
                      Выбрать файл
                    </span>
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
