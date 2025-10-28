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
  rules: [
    // Base colors
    { token: '', foreground: 'ebdbb2', background: '1d2021' },

    // Comments
    { token: 'comment', foreground: '928374', fontStyle: 'italic' },

    // Keywords and operators
    { token: 'keyword', foreground: 'fb4934' },
    { token: 'keyword.operator', foreground: 'fe8019' },
    { token: 'keyword.control', foreground: 'fb4934' },

    // Strings
    { token: 'string', foreground: 'b8bb26' },
    { token: 'string.escape', foreground: 'fe8019' },

    // Numbers
    { token: 'number', foreground: 'd3869b' },
    { token: 'number.hex', foreground: 'd3869b' },
    { token: 'number.binary', foreground: 'd3869b' },
    { token: 'number.octal', foreground: 'd3869b' },

    // Types and classes
    { token: 'type', foreground: 'fabd2f' },
    { token: 'type.identifier', foreground: 'fabd2f' },
    { token: 'class', foreground: 'fabd2f' },

    // Functions
    { token: 'function', foreground: '8ec07c' },
    { token: 'function.call', foreground: '8ec07c' },

    // Variables and identifiers
    { token: 'identifier', foreground: 'ebdbb2' },
    { token: 'variable', foreground: '83a598' },
    { token: 'variable.predefined', foreground: 'd3869b' },

    // Constants
    { token: 'constant', foreground: 'd3869b' },

    // Tags (for HTML/XML)
    { token: 'tag', foreground: '8ec07c' },
    { token: 'tag.attribute', foreground: 'fabd2f' },

    // Delimiters
    { token: 'delimiter', foreground: 'a89984' },
    { token: 'delimiter.bracket', foreground: 'a89984' },

    // Annotations
    { token: 'annotation', foreground: 'fe8019' },
    { token: 'attribute', foreground: 'fabd2f' },

    // Invalid and errors
    { token: 'invalid', foreground: 'fb4934', fontStyle: 'bold' },
  ],
  colors: {
    // Editor background and foreground
    'editor.background': '#1d2021', // Gruvbox dark hard background
    'editor.foreground': '#ebdbb2', // Gruvbox light foreground

    // Line highlighting
    'editor.lineHighlightBackground': '#282828',
    'editor.lineHighlightBorder': '#00000000',

    // Line numbers
    'editorLineNumber.foreground': '#665c54', // Gruvbox dark4
    'editorLineNumber.activeForeground': '#a89984', // Gruvbox light4

    // Selection
    'editor.selectionBackground': '#504945', // Gruvbox dark2
    'editor.inactiveSelectionBackground': '#3c3836', // Gruvbox dark1
    'editor.selectionHighlightBackground': '#45403d',

    // Cursor
    'editorCursor.foreground': '#ebdbb2', // Gruvbox light foreground

    // Whitespace
    'editorWhitespace.foreground': '#3c3836', // Gruvbox dark1

    // Indent guides
    'editorIndentGuide.background': '#3c3836',
    'editorIndentGuide.activeBackground': '#665c54',

    // Scrollbar
    'scrollbarSlider.background': '#3c383680',
    'scrollbarSlider.hoverBackground': '#504945b0',
    'scrollbarSlider.activeBackground': '#665c54e0',

    // Editor widgets
    'editorWidget.background': '#282828',
    'editorWidget.border': '#504945',

    // Suggest widget
    'editorSuggestWidget.background': '#282828',
    'editorSuggestWidget.border': '#504945',
    'editorSuggestWidget.foreground': '#ebdbb2',
    'editorSuggestWidget.selectedBackground': '#504945',

    // Hover widget
    'editorHoverWidget.background': '#282828',
    'editorHoverWidget.border': '#504945',

    // Gutter
    'editorGutter.background': '#1d2021',

    // Bracket matching
    'editorBracketMatch.background': '#504945',
    'editorBracketMatch.border': '#a89984',
  },
};

export function registerCustomTheme(monaco: any) {
  monaco.editor.defineTheme('custom-dark', customDarkTheme);
  monaco.editor.defineTheme('gruvbox-dark-hard', gruvboxDarkHardTheme);
}
