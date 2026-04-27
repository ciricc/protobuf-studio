import { useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { getLocation } from 'jsonc-parser';
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

const SCHEMA_URI = 'inmemory://proto-schema.json';

// Walk the schema along a JSON path (from jsonc-parser's `loc.path`) and
// decide whether the object at the caret has any candidate keys to suggest.
// Returns false ONLY when we resolve cleanly to a map-shaped schema
// (`additionalProperties` value, no `properties`) — that's the case where
// Monaco would show an empty "No suggestions" widget. For any walk we can't
// resolve (unknown combinator, ref, etc.) we return true and let Monaco's
// own JSON service decide.
function schemaHasKeysAt(schema: JsonSchema | null | undefined, path: (string | number)[]): boolean {
  if (!schema) return false;
  let node: any = schema;
  for (const segment of path) {
    if (!node || typeof node !== 'object') return true;
    if (typeof segment === 'number') {
      if (!node.items) return true;
      node = node.items;
    } else {
      const next = node.properties?.[segment];
      if (next) {
        node = next;
      } else if (node.additionalProperties && typeof node.additionalProperties === 'object') {
        node = node.additionalProperties;
      } else {
        return true;
      }
    }
  }
  if (!node || typeof node !== 'object') return true;
  // Map-shaped: object whose only key-source is additionalProperties.
  const hasProps = !!node.properties && Object.keys(node.properties).length > 0;
  const hasAdditional = !!node.additionalProperties && typeof node.additionalProperties === 'object';
  if (!hasProps && hasAdditional) return false;
  return true;
}

export const JsonEditor = ({ value, onChange, schema, error, messageContext }: JsonEditorProps) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setMounted(true);

    registerCustomTheme(monaco);
    monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      window.dispatchEvent(new CustomEvent('triggerConversion'));
    });
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit1, () => {
      window.dispatchEvent(new CustomEvent('setFormat', { detail: 'base64' }));
    });
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit2, () => {
      window.dispatchEvent(new CustomEvent('setFormat', { detail: 'hex' }));
    });
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.Digit3, () => {
      window.dispatchEvent(new CustomEvent('setFormat', { detail: 'binary' }));
    });

    // Trigger suggestions only when the user is typing a property key.
    // Two valid moments:
    //   1. Just opened a key string — `"` (or auto-paired `""`).
    //   2. Typing characters inside an already-quoted key (e.g. fixing a
    //      typo in the middle of `"metadata"`).
    // Anywhere else (values, after `,`, blank lines) we stay quiet so Enter
    // remains a newline and typing isn't interrupted.
    //
    // We also skip when the surrounding schema has no candidate keys (e.g.
    // map<string,V>, where keys are user-defined) — otherwise Monaco shows
    // an empty "No suggestions" popup that just gets in the way.
    const KEY_CHAR = /^[A-Za-z0-9_]$/;
    let triggerTimer: ReturnType<typeof setTimeout> | null = null;
    editor.onDidChangeModelContent((e) => {
      if (e.changes.length !== 1) return;
      const inserted = e.changes[0].text;
      // Monaco's autoClosingQuotes makes a single `"` keystroke land as `""`
      // (cursor between). Accept both so the widget opens on the first press.
      const isQuote = inserted === '"' || inserted === '""';
      const isKeyChar = inserted.length === 1 && KEY_CHAR.test(inserted);
      if (!isQuote && !isKeyChar) return;
      if (triggerTimer) clearTimeout(triggerTimer);
      triggerTimer = setTimeout(() => {
        const model = editor.getModel();
        if (!model) return;
        const offset = model.getOffsetAt(editor.getPosition()!);
        try {
          const loc = getLocation(model.getValue(), offset);
          if (!loc.isAtPropertyKey) return;
          // When at a property-key, the last path segment is the partial key
          // being typed — skip it so we ask "does the parent object have
          // suggestable keys?", not "does the key's value-type have keys?".
          const parentPath = loc.path.slice(0, -1);
          if (!schemaHasKeysAt(schema, parentPath)) return;
          editor.trigger('auto', 'editor.action.triggerSuggest', {});
        } catch {
          // jsonc-parser doesn't throw, but be defensive.
        }
      }, 150);
    });
  };

  // Push the schema into Monaco's built-in JSON language service. The service
  // handles validation, hover, and completion (key/value/enum) on its own —
  // it knows the JSON grammar and applies the schema correctly. We don't
  // register a custom completion provider; the built-in one is what every
  // serious Monaco-based editor (VS Code, Theia, monaco-yaml…) uses.
  //
  // `fileMatch` must match the model's URI for the JSON service to actually
  // apply the schema. Monaco-react models look like `inmemory://model/1`,
  // which `*` does NOT match — globs don't traverse `://`. We pin the schema
  // to the editor's exact URI string instead.
  useEffect(() => {
    if (!mounted) return;
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;
    const modelUri = ed.getModel()?.uri.toString();
    if (!modelUri) return;
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      schemaValidation: 'warning',
      enableSchemaRequest: false,
      schemas: schema
        ? [
            {
              uri: SCHEMA_URI,
              fileMatch: [modelUri],
              schema,
            },
          ]
        : [],
    });
  }, [schema, mounted]);

  // Keep editor theme synced with the app theme.
  useEffect(() => {
    const monaco = monacoRef.current;
    if (monaco) {
      monaco.editor.setTheme(theme === 'dark' ? 'gruvbox-dark-hard' : 'vs');
    }
  }, [theme]);

  // Force-update the editor value on external change (project switch, decode).
  useEffect(() => {
    const ed = editorRef.current;
    if (ed && ed.getValue() !== value) {
      ed.setValue(value);
    }
  }, [value]);

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
            // Render the suggest widget in <body> so surrounding `overflow-hidden`
            // containers don't clip it when it grows past the editor boundary.
            fixedOverflowWidgets: true,
            // Disable noise sources unrelated to JSON schema completion:
            // word-based suggestions surface random words from the file,
            // and inline ghost-text shows up after stray characters.
            wordBasedSuggestions: 'off',
            inlineSuggest: { enabled: false },
            // Auto-trigger suggestions while typing inside strings; the JSON
            // language service decides whether to actually show fields.
            // No auto-triggering by Monaco. Both `quickSuggestions` (fires
            // on every typed char) and `suggestOnTriggerCharacters` (fires
            // when monaco-json sees `,`, `:`, `"`, etc.) would open the
            // widget where it isn't wanted. We trigger imperatively only
            // when the caret is in a property-key position.
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
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
