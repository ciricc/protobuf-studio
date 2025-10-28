import { useState, useRef, useEffect } from 'react';
import { Copy, FileText } from 'lucide-react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { protobufLanguageConfiguration, protobufMonarchLanguage } from '../utils/protobufLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { registerCustomTheme } from '../utils/monacoTheme';

interface MessageDefinitionProps {
  definition: string | null;
  messageName: string | null;
}

export const MessageDefinition = ({ definition, messageName }: MessageDefinitionProps) => {
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isLanguageRegistered, setIsLanguageRegistered] = useState(false);
  const { theme } = useTheme();

  const handleEditorWillMount = (monaco: Monaco) => {
    // Register custom dark theme
    registerCustomTheme(monaco);

    // Register protobuf language only once
    if (!isLanguageRegistered) {
      // Check if language is already registered
      const languages = monaco.languages.getLanguages();
      const isProtoRegistered = languages.some((lang) => lang.id === 'protobuf');

      if (!isProtoRegistered) {
        // Register the language
        monaco.languages.register({ id: 'protobuf' });

        // Set language configuration
        monaco.languages.setLanguageConfiguration('protobuf', protobufLanguageConfiguration);

        // Set monarch tokenizer
        monaco.languages.setMonarchTokensProvider('protobuf', protobufMonarchLanguage);
      }

      setIsLanguageRegistered(true);
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  // Update Monaco Editor theme when app theme changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');
      }
    }
  }, [theme]);

  const handleCopy = async () => {
    if (definition) {
      try {
        await navigator.clipboard.writeText(definition);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 space-y-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
        {/* Schema Info Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">
            Message Definition
          </label>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-600 dark:text-blue-400" />
            {messageName ? (
              <span className="text-sm text-gray-700 dark:text-neutral-300 font-mono bg-white dark:bg-neutral-900 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-700">
                {messageName}
              </span>
            ) : (
              <span className="text-sm text-gray-500 dark:text-neutral-400 italic">
                No message selected
              </span>
            )}
          </div>
        </div>

        {/* Actions Section */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-2">
            Actions
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={!definition}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:bg-gray-50 dark:disabled:bg-neutral-800 disabled:text-gray-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed transition-all text-sm font-medium"
              title="Copy definition to clipboard"
            >
              <Copy size={16} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-3">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Schema
        </label>
        <div className="flex-1 border rounded overflow-hidden bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700">
          {definition ? (
            <Editor
              value={definition}
              language="protobuf"
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
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 dark:text-neutral-500 italic text-center text-sm">
                Select a message to view its definition
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
