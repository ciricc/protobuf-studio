import { Type } from 'protobufjs';

/**
 * Normalizes enum values in an object from string names to numeric values
 * This is needed because protobufjs verify() expects numeric enum values,
 * but JSON can have string enum names (which is valid in proto3 JSON format)
 */
export function normalizeEnumValues(obj: any, type: Type): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => {
      if (typeof item === 'object' && item !== null) {
        return normalizeEnumValues(item, type);
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

    // Check if this field is an enum
    if (field.resolvedType && (field.resolvedType as any).values !== undefined) {
      const enumType = field.resolvedType as any;

      // If value is a string, convert to number
      if (typeof value === 'string') {
        const enumValue = enumType.values[value];
        result[key] = enumValue !== undefined ? enumValue : value;
      } else {
        result[key] = value;
      }
    } else if (field.resolvedType instanceof Type && typeof value === 'object' && value !== null) {
      // Nested message - recursively normalize
      if (field.repeated) {
        result[key] = value.map((item: any) => normalizeEnumValues(item, field.resolvedType as Type));
      } else {
        result[key] = normalizeEnumValues(value, field.resolvedType as Type);
      }
    } else {
      result[key] = value;
    }
  });

  return result;
}
