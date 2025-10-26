import type { Root } from 'protobufjs';

export interface ProtoState {
  root: Root | null;
  availableMessages: string[];
  selectedMessage: string | null;
  error: string | null;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ConversionResult {
  binary?: Uint8Array;
  base64?: string;
  hex?: string;
  json?: string;
  textproto?: string;
  error?: string;
}

export type OutputFormat = 'binary' | 'base64' | 'hex' | 'json' | 'textproto';

export interface JsonSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  enum?: any[];
  description?: string;
}