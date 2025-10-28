import { useCallback } from 'react';
import { Root } from 'protobufjs';
import type { ConversionResult, OutputFormat } from '../types/proto';
import { normalizeEnumValues } from '../utils/normalizeEnumValues';
import { normalizeBytesFields } from '../utils/normalizeBytesFields';

export const useConversion = (root: Root | null, selectedMessage: string | null) => {
  const convert = useCallback(
    (jsonText: string, format: OutputFormat): ConversionResult => {
      if (!root || !selectedMessage) {
        return { error: 'No message type selected' };
      }

      try {
        const type = root.lookupType(selectedMessage);
        const obj = JSON.parse(jsonText);

        // Normalize enum values (convert string enum names to numbers)
        let normalizedObj = normalizeEnumValues(obj, type);

        // Normalize bytes fields (convert plain text to base64)
        normalizedObj = normalizeBytesFields(normalizedObj, type);

        // Verify the object first
        const verifyError = type.verify(normalizedObj);
        if (verifyError) {
          return { error: `Validation error: ${verifyError}` };
        }

        // Create message from object
        const message = type.fromObject(normalizedObj);

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

          case 'textproto':
            return { textproto: messageToProtoText(message, type, 0) };

          default:
            return { error: 'Unknown format' };
        }
      } catch (error) {
        let errorMessage = error instanceof Error ? error.message : 'Conversion failed';

        // Add helpful context for common errors
        if (errorMessage.includes('invalid encoding') || errorMessage.includes('Invalid encoding')) {
          errorMessage += '\n\nNote: For bytes fields, you can enter plain text (it will be auto-converted to base64) or valid base64-encoded data.';
        }

        return { error: errorMessage };
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
        textproto: convert(jsonText, 'textproto'),
      };
    },
    [convert]
  );

  return {
    convert,
    convertAll,
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

// Convert protobuf message to ProtoText format (canonical text format)
// Based on the protocol buffers text format specification:
// https://protobuf.dev/reference/protobuf/textformat-spec/
function messageToProtoText(message: any, type: any, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const lines: string[] = [];

  if (!message || !type.fields) {
    return '';
  }

  // Convert message to object first
  const obj = typeof message.toObject === 'function' ? message.toObject() : message;

  // Process each field in the message type definition
  Object.keys(type.fields).forEach((fieldName) => {
    const field = type.fields[fieldName];
    const value = obj[fieldName];

    // Skip undefined values - they're not set
    if (value === undefined) {
      return;
    }

    // Handle repeated fields
    if (field.repeated && Array.isArray(value)) {
      // Skip empty repeated fields
      if (value.length === 0) {
        return;
      }

      // Output each element on its own line
      value.forEach((item) => {
        lines.push(formatFieldValue(fieldName, item, field, indent, indentLevel));
      });
      return;
    }

    // Skip zero/default values for proto3 singular fields
    // In proto3, unset fields default to zero values and shouldn't be serialized
    // unless explicitly set (we can't distinguish this in JS, so we skip zero values)
    if (!field.repeated && !field.map && isDefaultValue(value, field)) {
      // Exception: always include message types even if empty
      if (!(field.resolvedType && typeof value === 'object' && !Array.isArray(value))) {
        return;
      }
    }

    // Handle regular fields
    lines.push(formatFieldValue(fieldName, value, field, indent, indentLevel));
  });

  return lines.join('\n');
}

// Format a single field value
function formatFieldValue(
  fieldName: string,
  value: any,
  field: any,
  indent: string,
  indentLevel: number
): string {
  // Handle enum fields - output symbolic name instead of number
  if (field.resolvedType && (field.resolvedType as any).values !== undefined) {
    const enumType = field.resolvedType as any;
    const enumName = getEnumName(value, enumType);
    return `${indent}${fieldName}: ${enumName}`;
  }

  // Handle nested message fields
  if (field.resolvedType && typeof value === 'object' && !Array.isArray(value)) {
    const nestedText = messageToProtoText(value, field.resolvedType, indentLevel + 1);
    if (nestedText) {
      return `${indent}${fieldName}: {\n${nestedText}\n${indent}}`;
    }
    return `${indent}${fieldName}: {}`;
  }

  // Handle bytes fields (they come as Uint8Array or base64 string from protobufjs)
  if (field.type === 'bytes') {
    // Convert bytes to string representation
    let bytesStr: string;
    if (typeof value === 'string') {
      bytesStr = value;
    } else if (value instanceof Uint8Array) {
      // Convert Uint8Array to string
      bytesStr = new TextDecoder('utf-8', { fatal: false }).decode(value);
    } else {
      bytesStr = String(value);
    }
    return `${indent}${fieldName}: ${escapeString(bytesStr)}`;
  }

  // Handle primitive fields
  if (typeof value === 'string') {
    return `${indent}${fieldName}: ${escapeString(value)}`;
  }

  if (typeof value === 'boolean') {
    return `${indent}${fieldName}: ${value ? 'true' : 'false'}`;
  }

  // Numbers, etc.
  return `${indent}${fieldName}: ${value}`;
}

// Check if a value is the default/zero value for its field type
function isDefaultValue(value: any, field: any): boolean {
  // null is always considered default
  if (value === null) {
    return true;
  }

  // Check based on field type
  if (field.resolvedType) {
    // Enum: check if it's the first enum value (usually 0)
    if ((field.resolvedType as any).values !== undefined) {
      const enumType = field.resolvedType as any;
      const firstValue = Object.values(enumType.values)[0];
      return value === firstValue || value === 0;
    }
    // Message types are never considered "default" - always serialize them
    return false;
  }

  // Primitive types
  switch (field.type) {
    case 'bool':
      return value === false;
    case 'string':
    case 'bytes':
      return value === '' || value === null;
    case 'double':
    case 'float':
    case 'int32':
    case 'int64':
    case 'uint32':
    case 'uint64':
    case 'sint32':
    case 'sint64':
    case 'fixed32':
    case 'fixed64':
    case 'sfixed32':
    case 'sfixed64':
      return value === 0 || value === '0';
    default:
      return false;
  }
}

// Get enum symbolic name from numeric value
function getEnumName(value: number | string, enumType: any): string {
  // If already a string, return as-is
  if (typeof value === 'string') {
    return value;
  }

  // Find the enum name for this numeric value
  const entries = Object.entries(enumType.values);
  for (const [name, num] of entries) {
    if (num === value) {
      return name;
    }
  }

  // Fallback to numeric value if name not found
  return String(value);
}

// Escape string for prototext format
// Implements proper escaping according to protobuf text format spec
function escapeString(str: string): string {
  let escaped = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);

    switch (char) {
      case '"':
        escaped += '\\"';
        break;
      case '\\':
        escaped += '\\\\';
        break;
      case '\n':
        escaped += '\\n';
        break;
      case '\r':
        escaped += '\\r';
        break;
      case '\t':
        escaped += '\\t';
        break;
      default:
        // Check for non-printable ASCII or invalid UTF-8
        if (code < 32 || code > 126) {
          // Escape as hex for non-ASCII characters
          escaped += '\\x' + code.toString(16).padStart(2, '0');
        } else {
          escaped += char;
        }
    }
  }
  return `"${escaped}"`;
}