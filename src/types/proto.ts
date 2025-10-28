import type { Root } from 'protobufjs';

export interface MessageContext {
  messageName: string;
  fileName: string | null;
  packageName: string | null;
}

export interface ProtoState {
  root: Root | null;
  availableMessages: string[];
  selectedMessage: string | null;
  error: string | null;
  loadedFiles: Map<string, string>; // путь файла → содержимое
  unresolvedImports: string[]; // список недостающих импортов
  mainFile: string | null; // имя главного файла
  messageContext: MessageContext | null; // контекст выбранного сообщения
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ConversionResult {
  binary?: Uint8Array;
  base64?: string;
  hex?: string;
  textproto?: string;
  error?: string;
}

export type OutputFormat = 'binary' | 'base64' | 'hex' | 'textproto';

export interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  enum?: any[];
  oneOf?: JsonSchema[];
  description?: string;
  $ref?: string;
  definitions?: Record<string, any>;
}