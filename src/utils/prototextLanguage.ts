import type { languages } from 'monaco-editor';

export const prototextLanguageConfiguration: languages.LanguageConfiguration = {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['<', '>'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
  ],
};

export const prototextMonarchLanguage: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.prototext',

  keywords: [
    'true',
    'false',
    'inf',
    'nan',
  ],

  // Define symbols for special characters
  symbols: /[=><!~?:&|+\-*/^%]+/,

  // Escapes
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  // The main tokenizer
  tokenizer: {
    root: [
      // Field names (identifiers before colon)
      [/[a-zA-Z_][\w]*(?=\s*:)/, 'variable.name'],

      // Type names in angle brackets or after opening bracket
      [/[A-Z][\w]*/, 'type.identifier'],

      // Identifiers
      [/[a-z_][\w]*/, {
        cases: {
          '@keywords': 'keyword',
          '@default': 'identifier',
        },
      }],

      // Whitespace
      { include: '@whitespace' },

      // Delimiters and operators
      [/[{}[\]<>]/, '@brackets'],
      [/:/, 'delimiter'],
      [/[;,.]/, 'delimiter'],

      // Numbers
      [/-?\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
      [/-?0[xX][0-9a-fA-F]+/, 'number.hex'],
      [/-?\d+/, 'number'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-terminated string
      [/"/, { token: 'string.quote', bracket: '@open', next: '@string_double' }],
      [/'/, { token: 'string.quote', bracket: '@open', next: '@string_single' }],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }],
    ],

    whitespace: [
      [/[ \t\r\n]+/, 'white'],
      [/#.*$/, 'comment'],
    ],
  },
};
