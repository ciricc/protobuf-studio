import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { JsonSchema } from '../types/proto';
import { useTheme } from '../contexts/ThemeContext';
import { registerCustomTheme } from '../utils/monacoTheme';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  schema?: JsonSchema | null;
  error?: string | null;
}

export const JsonEditor = ({ value, onChange, schema, error }: JsonEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register custom dark theme
    registerCustomTheme(monaco);

    // Set initial theme based on current app theme
    monaco.editor.setTheme(theme === 'dark' ? 'custom-dark' : 'vs');

    // Configure JSON language settings with better completion support
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemaValidation: 'error',
      enableSchemaRequest: false,
    });
  };

  useEffect(() => {
    if (schema && editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        // // Update schema for validation and autocomplete
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          schemaValidation: 'error',
          enableSchemaRequest: false,
          schemas: [
            {
              uri: 'inmemory://proto-schema.json',
              fileMatch: ['*'],
              schema: schema,
            },
          ],
        });
      }
    }
  }, [schema]);

  // Update Monaco Editor theme when app theme changes
  useEffect(() => {
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        monaco.editor.setTheme(theme === 'dark' ? 'custom-dark' : 'vs');
      }
    }
  }, [theme]);

  // Force update editor value when it changes externally
  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const currentValue = editor.getValue();
      if (currentValue !== value) {
        editor.setValue(value);
      }
    }
  }, [value]);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 h-[45px]">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">JSON Editor</label>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400 font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded">
            Validation Error
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden relative" tabIndex={0} role="textbox">
        {error && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-400 dark:bg-red-500 z-10 pointer-events-none" />
        )}
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          theme={theme === 'dark' ? 'custom-dark' : 'vs'}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            suggest: {
              showProperties: true,
              showFields: true,
            },
            quickSuggestions: {
              strings: true,
              comments: false,
              other: true,
            },
            padding: { top: 12, bottom: 12 },
          }}
        />
        {error && (
          <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-red-50/95 dark:bg-red-900/80 backdrop-blur-sm border-t border-red-200 dark:border-red-800 z-10">
            <p className="text-sm text-red-700 dark:text-red-400 font-mono">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};