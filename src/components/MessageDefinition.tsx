import { useState, useRef, useEffect } from 'react';
import { Copy } from 'lucide-react';
import Editor, { type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { protobufLanguageConfiguration, protobufMonarchLanguage } from '../utils/protobufLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { registerCustomTheme } from '../utils/monacoTheme';

interface MessageDefinitionProps {
  definition: string | null;
  messageName: string | null;
}

export const MessageDefinition = ({ definition }: MessageDefinitionProps) => {
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
      {/* Header with title and copy button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 h-[45px]">
        <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">
          Message Definition
        </label>
        <button
          onClick={handleCopy}
          disabled={!definition}
          className="flex items-center justify-center gap-1.5 p-2 text-gray-600 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-700 rounded disabled:text-gray-400 dark:disabled:text-neutral-600 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          title="Copy definition to clipboard"
        >
          <Copy size={16} />
          {copied && <span className="text-xs">{copied ? 'Copied!' : ''}</span>}
        </button>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden p-3">
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
