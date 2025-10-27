import type { editor } from 'monaco-editor';

// Custom dark theme that matches our app's dark mode color scheme
export const customDarkTheme: editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'e5e7eb', background: '111827' },
    { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
    { token: 'keyword', foreground: '60a5fa' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'type', foreground: '818cf8' },
    { token: 'identifier', foreground: 'e5e7eb' },
  ],
  colors: {
    'editor.background': '#111827', // gray-900
    'editor.foreground': '#e5e7eb', // gray-200
    'editor.lineHighlightBackground': '#1f2937', // gray-800
    'editorLineNumber.foreground': '#6b7280', // gray-500
    'editorLineNumber.activeForeground': '#9ca3af', // gray-400
    'editor.selectionBackground': '#374151', // gray-700
    'editor.inactiveSelectionBackground': '#1f2937', // gray-800
    'editorCursor.foreground': '#60a5fa', // blue-400
    'editorWhitespace.foreground': '#374151', // gray-700
    'editorIndentGuide.background': '#374151', // gray-700
    'editorIndentGuide.activeBackground': '#4b5563', // gray-600
    'scrollbarSlider.background': '#374151aa', // gray-700 with transparency
    'scrollbarSlider.hoverBackground': '#4b5563aa', // gray-600 with transparency
    'scrollbarSlider.activeBackground': '#6b7280aa', // gray-500 with transparency
  },
};

export function registerCustomTheme(monaco: any) {
  monaco.editor.defineTheme('custom-dark', customDarkTheme);
}
