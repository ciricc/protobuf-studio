import { Type } from 'protobufjs';

/**
 * Checks if a string is valid base64
 */
function isValidBase64(str: string): boolean {
  if (str === '') return true; // Empty string is valid for bytes

  // Base64 pattern: letters, numbers, +, /, and optional = padding
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

  // Check pattern and length (must be multiple of 4 when padded)
  if (!base64Pattern.test(str)) return false;

  // Check if length is valid (after padding, should be multiple of 4)
  const paddedLength = str.length + (str.match(/=/g) || []).length;
  return paddedLength % 4 === 0;
}

/**
 * Converts a UTF-8 string to base64
 */
function utf8ToBase64(str: string): string {
  // Convert string to UTF-8 bytes
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  // Convert bytes to base64
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Normalizes bytes fields in an object to valid base64 format
 * If a bytes field contains plain text, it will be converted to base64
 * If it's already valid base64, it will be kept as is
 */
export function normalizeBytesFields(obj: any, type: Type): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return normalizeBytesFields(item, type);
      }
      return item;
    });
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const result: any = {};

  Object.keys(obj).forEach(key => {
    const field = type.fields[key];
    const value = obj[key];

    if (!field) {
      // Field not found in type, keep as is
      result[key] = value;
      return;
    }

    // Check if this field is bytes type
    if (field.type === 'bytes' && typeof value === 'string' && value !== '') {
      // If it's not valid base64, convert plain text to base64
      if (!isValidBase64(value)) {
        result[key] = utf8ToBase64(value);
      } else {
        result[key] = value;
      }
    } else if (field.resolvedType instanceof Type && typeof value === 'object' && value !== null) {
      // Nested message - recursively normalize
      if (field.repeated) {
        result[key] = value.map((item: any) => normalizeBytesFields(item, field.resolvedType as Type));
      } else {
        result[key] = normalizeBytesFields(value, field.resolvedType as Type);
      }
    } else {
      result[key] = value;
    }
  });

  return result;
}
