import type { editor } from 'monaco-editor';

// Custom dark theme that matches our app's dark mode color scheme
export const customDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'd4d4d4', background: '171717' },
    { token: 'comment', foreground: '737373', fontStyle: 'italic' },
    { token: 'keyword', foreground: '60a5fa' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'type', foreground: '818cf8' },
    { token: 'identifier', foreground: 'd4d4d4' },
  ],
  colors: {
    'editor.background': '#171717', // neutral-900
    'editor.foreground': '#d4d4d4', // neutral-300
    'editor.lineHighlightBackground': '#262626', // neutral-800
    'editorLineNumber.foreground': '#737373', // neutral-500
    'editorLineNumber.activeForeground': '#a3a3a3', // neutral-400
    'editor.selectionBackground': '#404040', // neutral-700
    'editor.inactiveSelectionBackground': '#262626', // neutral-800
    'editorCursor.foreground': '#60a5fa', // blue-400
    'editorWhitespace.foreground': '#404040', // neutral-700
    'editorIndentGuide.background': '#404040', // neutral-700
    'editorIndentGuide.activeBackground': '#525252', // neutral-600
    'scrollbarSlider.background': '#404040aa', // neutral-700 with transparency
    'scrollbarSlider.hoverBackground': '#525252aa', // neutral-600 with transparency
    'scrollbarSlider.activeBackground': '#737373aa', // neutral-500 with transparency
  },
};

// Gruvbox Dark Hard theme
// Based on the Gruvbox Dark Hard color palette
export const gruvboxDarkHardTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  // Near-monochrome palette: only literal values (strings, numbers,
  // true/false/null) carry color. Everything else — keywords, types,
  // identifiers, brackets, delimiters — sits on the foreground or a muted
  // gray. Goal is structural reading from indentation/layout, not from
  // a sea of token colors.
  rules: [
    // Base
    { token: '', foreground: 'd4d4d4', background: '171717' }, // neutral-300

    // Muted
    { token: 'comment', foreground: '737373', fontStyle: 'italic' }, // neutral-500
    { token: 'delimiter', foreground: '737373' },
    { token: 'delimiter.bracket', foreground: '737373' },

    // Literal values (only these carry color)
    { token: 'string', foreground: 'b8bb26' }, // green
    { token: 'string.escape', foreground: 'b8bb26' },
    { token: 'number', foreground: 'd3869b' }, // pink
    { token: 'number.hex', foreground: 'd3869b' },
    { token: 'number.binary', foreground: 'd3869b' },
    { token: 'number.octal', foreground: 'd3869b' },
    { token: 'constant', foreground: 'd3869b' },

    // Structural keywords (`message`, `enum`, `repeated`, `package`, …)
    // get a soft pink so the schema's skeleton is readable at a glance.
    { token: 'keyword', foreground: 'd3869b' },
    { token: 'keyword.operator', foreground: 'd4d4d4' },
    { token: 'keyword.control', foreground: 'd3869b' },
    // Types are proto's only "values" — give them one soft accent so the
    // schema isn't a wall of white. Aqua complements green/pink without
    // competing for attention.
    { token: 'type', foreground: '8ec07c' },
    { token: 'type.identifier', foreground: '8ec07c' },
    { token: 'class', foreground: '8ec07c' },
    { token: 'identifier', foreground: 'd4d4d4' },
    { token: 'variable', foreground: 'd4d4d4' },
    { token: 'function', foreground: 'd4d4d4' },
    { token: 'function.call', foreground: 'd4d4d4' },
    { token: 'tag', foreground: 'd4d4d4' },
    { token: 'tag.attribute', foreground: 'd4d4d4' },
    { token: 'annotation', foreground: 'd4d4d4' },
    { token: 'attribute', foreground: 'd4d4d4' },

    // Errors stay loud
    { token: 'invalid', foreground: 'fb4934', fontStyle: 'bold' },

    // JSON-specific scopes (Monaco's JSON tokenizer uses its own names)
    { token: 'string.key.json', foreground: 'd4d4d4' }, // keys → foreground
    { token: 'string.value.json', foreground: 'b8bb26' }, // values → green
    { token: 'number.json', foreground: 'd3869b' }, // numbers → pink
    { token: 'keyword.json', foreground: 'd3869b' }, // true/false/null → pink
    { token: 'delimiter.bracket.json', foreground: '737373' },
    { token: 'delimiter.array.json', foreground: '737373' },
    { token: 'delimiter.colon.json', foreground: '737373' },
    { token: 'delimiter.comma.json', foreground: '737373' },
  ],
  // Chrome colors are pinned to Tailwind's neutral palette so the editor
  // blends seamlessly with the surrounding panels (`bg-neutral-900` etc.).
  // Only the syntax-token foregrounds keep their gruvbox warmth.
  colors: {
    // Editor background and foreground
    'editor.background': '#171717', // neutral-900 — matches panel chrome
    'editor.foreground': '#e5e5e5', // neutral-200

    // Line highlighting
    'editor.lineHighlightBackground': '#1f1f1f',
    'editor.lineHighlightBorder': '#00000000',

    // Line numbers
    'editorLineNumber.foreground': '#525252', // neutral-600
    'editorLineNumber.activeForeground': '#a3a3a3', // neutral-400

    // Selection
    'editor.selectionBackground': '#404040', // neutral-700
    'editor.inactiveSelectionBackground': '#262626', // neutral-800
    'editor.selectionHighlightBackground': '#2d2d2d',

    // Cursor
    'editorCursor.foreground': '#e5e5e5', // neutral-200

    // Whitespace
    'editorWhitespace.foreground': '#262626', // neutral-800

    // Indent guides
    'editorIndentGuide.background': '#262626', // neutral-800
    'editorIndentGuide.activeBackground': '#404040', // neutral-700

    // Scrollbar
    'scrollbarSlider.background': '#40404080',
    'scrollbarSlider.hoverBackground': '#525252b0',
    'scrollbarSlider.activeBackground': '#737373e0',

    // Editor widgets
    'editorWidget.background': '#1f1f1f',
    'editorWidget.border': '#404040',

    // Suggest widget
    'editorSuggestWidget.background': '#1f1f1f',
    'editorSuggestWidget.border': '#404040',
    'editorSuggestWidget.foreground': '#e5e5e5',
    'editorSuggestWidget.selectedBackground': '#404040',

    // Hover widget
    'editorHoverWidget.background': '#1f1f1f',
    'editorHoverWidget.border': '#404040',

    // Gutter
    'editorGutter.background': '#171717', // neutral-900

    // Bracket matching
    'editorBracketMatch.background': '#404040',
    'editorBracketMatch.border': '#a3a3a3',
  },
};

export function registerCustomTheme(monaco: any) {
  monaco.editor.defineTheme('custom-dark', customDarkTheme);
  monaco.editor.defineTheme('gruvbox-dark-hard', gruvboxDarkHardTheme);
}
