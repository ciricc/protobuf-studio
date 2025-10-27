import { Type, Field, Enum } from 'protobufjs';

/**
 * Generates a default JSON object with zero values for a protobuf message type
 * @param type - The protobuf Type to generate defaults for
 * @param maxDepth - Maximum nesting depth (default: 2)
 * @param currentDepth - Current recursion depth (internal use)
 * @returns Default object with zero values
 */
export function generateDefaultMessage(
  type: Type,
  maxDepth: number = 2,
  currentDepth: number = 0
): Record<string, any> {
  const result: Record<string, any> = {};

  // Stop recursion if we've reached max depth
  if (currentDepth >= maxDepth) {
    return result;
  }

  // Track which fields are part of oneof groups and should be skipped
  const oneofFields = new Set<string>();

  // Process oneof groups first - only include the first field from each oneof
  if (type.oneofsArray && type.oneofsArray.length > 0) {
    type.oneofsArray.forEach((oneof) => {
      // Mark all fields in this oneof group
      oneof.fieldsArray.forEach((field) => {
        oneofFields.add(field.name);
      });

      // Only generate value for the FIRST field in the oneof group
      if (oneof.fieldsArray.length > 0) {
        const firstField = oneof.fieldsArray[0];
        result[firstField.name] = generateDefaultFieldValue(firstField, maxDepth, currentDepth);
      }
    });
  }

  // Process regular fields (excluding oneof fields)
  Object.values(type.fields).forEach((field: Field) => {
    // Skip fields that are part of oneof groups (already processed above)
    if (!oneofFields.has(field.name)) {
      result[field.name] = generateDefaultFieldValue(field, maxDepth, currentDepth);
    }
  });

  return result;
}

/**
 * Generates default value for a single field
 */
function generateDefaultFieldValue(
  field: Field,
  maxDepth: number,
  currentDepth: number
): any {
  // Handle repeated fields - always return empty array
  if (field.repeated) {
    return [];
  }

  // Handle map fields - always return empty object
  if (field.map) {
    return {};
  }

  // Handle different field types
  return generateDefaultValueByType(field, maxDepth, currentDepth);
}

/**
 * Generates default value based on field type
 */
function generateDefaultValueByType(
  field: Field,
  maxDepth: number,
  currentDepth: number
): any {
  const protoType = field.type;

  // Primitive types
  const primitiveDefaults: Record<string, any> = {
    double: 0,
    float: 0,
    int32: 0,
    int64: 0,
    uint32: 0,
    uint64: 0,
    sint32: 0,
    sint64: 0,
    fixed32: 0,
    fixed64: 0,
    sfixed32: 0,
    sfixed64: 0,
    bool: false,
    string: '',
    bytes: '',
  };

  if (protoType in primitiveDefaults) {
    return primitiveDefaults[protoType];
  }

  // Handle resolved types (enums and nested messages)
  if (field.resolvedType) {
    const resolvedType = field.resolvedType;
    const fullName = (resolvedType as any).fullName || protoType;

    // Check if it's an Enum
    if ((resolvedType as any).values !== undefined) {
      return generateDefaultEnumValue(resolvedType as any);
    }

    // Check if it's a google.protobuf well-known type
    if (fullName && fullName.startsWith('google.protobuf.')) {
      return generateDefaultWellKnownType(fullName);
    }

    // Handle nested message types
    if (resolvedType instanceof Type) {
      // Don't generate nested defaults if we've reached max depth
      if (currentDepth + 1 >= maxDepth) {
        return {};
      }
      return generateDefaultMessage(resolvedType, maxDepth, currentDepth + 1);
    }
  }

  // Fallback for unknown types
  return {};
}

/**
 * Generates default value for enum (first enum numeric value)
 * In protobuf JSON, enums can be represented as either strings or numbers,
 * but we use numbers for default values as they're always valid
 */
function generateDefaultEnumValue(enumType: Enum): number {
  const values = Object.values(enumType.values);
  if (values.length > 0) {
    // Return the first enum numeric value (usually 0)
    return values[0];
  }
  return 0;
}

/**
 * Generates default values for google.protobuf well-known types
 */
function generateDefaultWellKnownType(fullName: string): any {
  const typeName = fullName.replace('google.protobuf.', '');

  // Wrapper types
  const wrapperDefaults: Record<string, any> = {
    'StringValue': '',
    'Int32Value': 0,
    'Int64Value': 0,
    'UInt32Value': 0,
    'UInt64Value': 0,
    'FloatValue': 0.0,
    'DoubleValue': 0.0,
    'BoolValue': false,
    'BytesValue': '',
  };

  if (typeName in wrapperDefaults) {
    return wrapperDefaults[typeName];
  }

  // Special well-known types
  switch (typeName) {
    case 'Timestamp':
      return { seconds: 0, nanos: 0 };
    case 'Duration':
      return { seconds: 0, nanos: 0 };
    case 'Empty':
      return {};
    case 'Struct':
      return {};
    case 'Value':
      return null;
    case 'ListValue':
      return { values: [] };
    case 'FieldMask':
      return { paths: [] };
    case 'Any':
      return { typeUrl: '', value: '' };
    default:
      return {};
  }
}

/**
 * Converts default message object to formatted JSON string
 */
export function generateDefaultMessageJson(type: Type, maxDepth: number = 2): string {
  const defaultObj = generateDefaultMessage(type, maxDepth);
  return JSON.stringify(defaultObj, null, 2);
}
