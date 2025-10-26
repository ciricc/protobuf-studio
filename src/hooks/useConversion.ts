import { useCallback } from 'react';
import { Root } from 'protobufjs';
import type { ConversionResult, OutputFormat } from '../types/proto';

export const useConversion = (root: Root | null, selectedMessage: string | null) => {
  const convert = useCallback(
    (jsonText: string, format: OutputFormat): ConversionResult => {
      if (!root || !selectedMessage) {
        return { error: 'No message type selected' };
      }

      try {
        const type = root.lookupType(selectedMessage);
        const obj = JSON.parse(jsonText);

        // Verify the object first
        const verifyError = type.verify(obj);
        if (verifyError) {
          return { error: `Validation error: ${verifyError}` };
        }

        // Create message from object
        const message = type.fromObject(obj);

        // Encode to binary
        const buffer = type.encode(message).finish();

        // Convert based on format
        switch (format) {
          case 'binary':
            return { binary: buffer };

          case 'base64':
            return { base64: uint8ArrayToBase64(buffer) };

          case 'hex':
            return { hex: uint8ArrayToHex(buffer) };

          case 'json':
            return { json: JSON.stringify(obj, null, 2) };

          case 'textproto':
            return { textproto: objectToTextProto(obj, 0) };

          default:
            return { error: 'Unknown format' };
        }
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Conversion failed',
        };
      }
    },
    [root, selectedMessage]
  );

  const convertAll = useCallback(
    (jsonText: string): Record<OutputFormat, ConversionResult> => {
      return {
        binary: convert(jsonText, 'binary'),
        base64: convert(jsonText, 'base64'),
        hex: convert(jsonText, 'hex'),
        json: convert(jsonText, 'json'),
        textproto: convert(jsonText, 'textproto'),
      };
    },
    [convert]
  );

  const decodeFromBinary = useCallback(
    (buffer: Uint8Array): ConversionResult => {
      if (!root || !selectedMessage) {
        return { error: 'No message type selected' };
      }

      try {
        const type = root.lookupType(selectedMessage);
        const message = type.decode(buffer);
        const obj = type.toObject(message);

        return { json: JSON.stringify(obj, null, 2) };
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Decoding failed',
        };
      }
    },
    [root, selectedMessage]
  );

  const decodeFromBase64 = useCallback(
    (base64: string): ConversionResult => {
      try {
        const buffer = base64ToUint8Array(base64);
        return decodeFromBinary(buffer);
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Base64 decoding failed',
        };
      }
    },
    [decodeFromBinary]
  );

  const decodeFromHex = useCallback(
    (hex: string): ConversionResult => {
      try {
        const buffer = hexToUint8Array(hex);
        return decodeFromBinary(buffer);
      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Hex decoding failed',
        };
      }
    },
    [decodeFromBinary]
  );

  return {
    convert,
    convertAll,
    decodeFromBinary,
    decodeFromBase64,
    decodeFromHex,
  };
};

// Helper functions for encoding/decoding

function uint8ArrayToBase64(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function hexToUint8Array(hex: string): Uint8Array {
  // Remove any spaces or non-hex characters
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');

  if (cleanHex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }

  const buffer = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    buffer[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return buffer;
}

// Convert JavaScript object to TextProto format
function objectToTextProto(obj: any, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const lines: string[] = [];

  if (obj === null || obj === undefined) {
    return '';
  }

  if (typeof obj !== 'object') {
    // Primitive value
    if (typeof obj === 'string') {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return String(obj);
  }

  if (Array.isArray(obj)) {
    // Array - each element on new line
    obj.forEach((item) => {
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        lines.push(objectToTextProto(item, indentLevel));
      } else {
        lines.push(indent + objectToTextProto(item, 0));
      }
    });
    return lines.join('\n');
  }

  // Object
  Object.entries(obj).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return; // Skip null/undefined values
    }

    if (Array.isArray(value)) {
      // Repeated field
      value.forEach((item) => {
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          lines.push(`${indent}${key} {`);
          lines.push(objectToTextProto(item, indentLevel + 1));
          lines.push(`${indent}}`);
        } else {
          lines.push(`${indent}${key}: ${objectToTextProto(item, 0)}`);
        }
      });
    } else if (typeof value === 'object') {
      // Nested message
      lines.push(`${indent}${key} {`);
      lines.push(objectToTextProto(value, indentLevel + 1));
      lines.push(`${indent}}`);
    } else {
      // Primitive field
      if (typeof value === 'string') {
        lines.push(`${indent}${key}: "${value.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${indent}${key}: ${value}`);
      }
    }
  });

  return lines.join('\n');
}