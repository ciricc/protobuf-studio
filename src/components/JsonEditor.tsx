import { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { JsonSchema, MessageContext } from '../types/proto';
import { useTheme } from '../contexts/ThemeContext';
import { registerCustomTheme } from '../utils/monacoTheme';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  schema?: JsonSchema | null;
  error?: string | null;
  messageContext?: MessageContext | null;
}

// Helper function to get type string from schema property
const getTypeLabel = (property: any): string => {
  if (!property) return '';

  if (property.type) {
    if (Array.isArray(property.type)) {
      return property.type.join(' | ');
    }
    if (property.type === 'array') {
      if (property.items?.$ref) {
        const refParts = property.items.$ref.split('/');
        const typeName = refParts[refParts.length - 1];
        return `${typeName}[]`;
      }
      if (property.items?.type) {
        return `${property.items.type}[]`;
      }
      return 'array';
    }
    return property.type;
  }

  if (property.enum) {
    return 'enum';
  }

  if (property.$ref) {
    // Extract type name from $ref
    const refParts = property.$ref.split('/');
    return refParts[refParts.length - 1];
  }

  return '';
};

// Helper function to get properties from schema at a given path
const getPropertiesFromPath = (schema: JsonSchema, path: string[]): any => {
  let current = schema;

  for (const key of path) {
    if (current.properties && current.properties[key]) {
      current = current.properties[key];

      // Handle $ref
      if (current.$ref && schema.definitions) {
        const refName = current.$ref.split('/').pop();
        if (refName && schema.definitions[refName]) {
          current = schema.definitions[refName];
        }
      }

      // Handle array items
      if (current.type === 'array' && current.items) {
        current = current.items;
        if (current.$ref && schema.definitions) {
          const refName = current.$ref.split('/').pop();
          if (refName && schema.definitions[refName]) {
            current = schema.definitions[refName];
          }
        }
      }
    } else {
      return null;
    }
  }

  return current.properties || null;
};

export const JsonEditor = ({ value, onChange, schema, error, messageContext }: JsonEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { theme } = useTheme();
  const completionProviderRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register custom dark theme
    registerCustomTheme(monaco);

    // Set initial theme based on current app theme
    monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');

    // Add Cmd+Enter keyboard shortcut for conversion
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      window.dispatchEvent(new CustomEvent('triggerConversion'));
    });

    // Add Alt+1 for Base64 format
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit1, () => {
      window.dispatchEvent(new CustomEvent('setFormat', { detail: 'base64' }));
    });

    // Add Alt+2 for Hex format
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit2, () => {
      window.dispatchEvent(new CustomEvent('setFormat', { detail: 'hex' }));
    });

    // Add Alt+3 for ProtoText format
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit3, () => {
      window.dispatchEvent(new CustomEvent('setFormat', { detail: 'textproto' }));
    });

    // Configure JSON language settings with better completion support
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemaValidation: 'error',
      enableSchemaRequest: false,
    });

    // Register custom completion provider that shows types
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    completionProviderRef.current = monaco.languages.registerCompletionItemProvider('json', {
      provideCompletionItems: (model, position) => {
        if (!schema) return { suggestions: [] };

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Parse the current path in JSON
        const lines = textUntilPosition.split('\n');
        const currentLine = lines[position.lineNumber - 1];
        const beforeCursor = currentLine.substring(0, position.column - 1);

        // Simple check if we're in a property key position
        const inPropertyKey = /[{,]\s*"?\w*$/.test(beforeCursor.trim());

        if (!inPropertyKey) {
          return { suggestions: [] };
        }

        // Get current JSON path
        const path: string[] = [];
        let braceCount = 0;

        for (let i = textUntilPosition.length - 1; i >= 0; i--) {
          const char = textUntilPosition[i];
          if (char === '}') braceCount++;
          if (char === '{') {
            braceCount--;
            if (braceCount < 0) break;
          }
        }

        // Get properties for current level
        const properties = getPropertiesFromPath(schema, path);

        if (!properties) {
          return { suggestions: [] };
        }

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = Object.keys(properties).map((key) => {
          const property = properties[key];
          const typeLabel = getTypeLabel(property);
          const description = property.description || '';

          return {
            label: key,
            kind: monaco.languages.CompletionItemKind.Property,
            insertText: `"${key}": `,
            range: range,
            detail: typeLabel, // Type shown on the right
            documentation: description,
            sortText: key,
          };
        });

        return { suggestions };
      },
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
        monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');
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

  // Cleanup completion provider on unmount
  useEffect(() => {
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 h-[45px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {messageContext ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-700 dark:text-neutral-300 flex-shrink-0">
                {messageContext.messageName.split('.').pop()}
              </span>
              <span className="text-xs text-gray-400 dark:text-neutral-500 flex-shrink-0">in</span>
              <span className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                {messageContext.fileName || 'unknown'}
              </span>
              {messageContext.packageName && (
                <>
                  <span className="text-xs text-gray-400 dark:text-neutral-500 flex-shrink-0">/</span>
                  <span className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                    {messageContext.packageName}
                  </span>
                </>
              )}
            </div>
          ) : (
            <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">JSON Editor</label>
          )}
        </div>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400 font-semibold px-2 py-1 bg-red-50 dark:bg-red-900/30 rounded flex-shrink-0">
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
          theme={theme === 'dark' ? 'gruvbox-dark-hard' : 'vs'}
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
              showInlineDetails: false, // Don't show details inline
              showStatusBar: false,
              preview: true,
              previewMode: 'subwordSmart',
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