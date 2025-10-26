import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { JsonSchema } from '../types/proto';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  schema?: JsonSchema | null;
  error?: string | null;
}

export const JsonEditor = ({ value, onChange, schema, error }: JsonEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // // Configure JSON language settings with better completion support
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-gray-700">JSON Editor</label>
        {error && (
          <span className="text-xs text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-lg">
            Validation Error
          </span>
        )}
      </div>
      <div
        className={`flex-1 border-2 rounded-xl overflow-hidden ${error ? 'border-red-300' : 'border-gray-200'}`}
        tabIndex={0}
        role="textbox"
      >
        <Editor
          height="100%"
          defaultLanguage="json"
          value={value}
          onChange={(value) => onChange(value || '')}
          onMount={handleEditorDidMount}
          theme="vs"
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
          }}
        />
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm text-red-700 font-mono">{error}</p>
        </div>
      )}
    </div>
  );
};