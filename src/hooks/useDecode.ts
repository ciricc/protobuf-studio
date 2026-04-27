import { useCallback } from 'react';
import { Root, Type } from 'protobufjs';

export type DecodeFormat = 'base64' | 'hex' | 'binary';

export interface DecodeResult {
  json?: string;
  error?: string;
}

const TO_OBJECT_OPTS = {
  enums: String,
  longs: String,
  bytes: String,
  defaults: false,
  arrays: false,
  objects: false,
  oneofs: true,
};

function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.replace(/\s+/g, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function hexToBytes(input: string): Uint8Array {
  const cleaned = input.replace(/(0x|\s|,)/gi, '');
  if (cleaned.length % 2 !== 0) {
    throw new Error('Hex string has odd length');
  }
  if (!/^[0-9a-fA-F]*$/.test(cleaned)) {
    throw new Error('Hex string contains non-hex characters');
  }
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function inputToBytes(input: string | Uint8Array, format: DecodeFormat): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (format === 'binary') {
    throw new Error('Binary format requires Uint8Array input, not string');
  }
  if (format === 'base64') return base64ToBytes(input);
  return hexToBytes(input);
}

function decodeToObject(type: Type, bytes: Uint8Array): unknown {
  const message = type.decode(bytes);
  return type.toObject(message, TO_OBJECT_OPTS);
}

export const useDecode = (root: Root | null, selectedMessage: string | null) => {
  const decode = useCallback(
    (input: string | Uint8Array, format: DecodeFormat): DecodeResult => {
      if (!root || !selectedMessage) {
        return { error: 'No message type selected' };
      }
      try {
        const type = root.lookupType(selectedMessage);
        const bytes = inputToBytes(input, format);
        const obj = decodeToObject(type, bytes);
        return { json: JSON.stringify(obj, null, 2) };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Decode failed',
        };
      }
    },
    [root, selectedMessage]
  );

  return { decode };
};
