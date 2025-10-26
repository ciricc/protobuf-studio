import { useState, useCallback } from 'react';
import { parse, Type, Field, common, Root } from 'protobufjs';
import type { ProtoState, ValidationResult, JsonSchema } from '../types/proto';

export const newRoot = (): Promise<Root> => {
  return new Root().load([
    'google/protobuf/duration.proto',
    'google/protobuf/empty.proto',
    'google/protobuf/field_mask.proto',
    'google/protobuf/struct.proto',
    'google/protobuf/timestamp.proto',
    'google/protobuf/wrappers.proto',
  ]);
};

export const useProtobuf = () => {
  const [state, setState] = useState<ProtoState>({
    root: null,
    availableMessages: [],
    selectedMessage: null,
    error: null,
  });

  const loadProtoFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();

      const root = await newRoot();

      // STEP 1: Parse user's proto file FIRST (parse() overwrites root.nested)
      parse(text, root, { keepCase: false });

      // Extract all message types
      const messages: string[] = [];
      const extractMessages = (namespace: any, prefix = '') => {
        if (!namespace || !namespace.nested) return;

        Object.keys(namespace.nested).forEach((key) => {
          const item = namespace.nested[key];
          const fullName = prefix ? `${prefix}.${key}` : key;

          if (item instanceof Type) {
            messages.push(fullName);
          }

          // Recursively check nested namespaces
          if (item.nested) {
            extractMessages(item, fullName);
          }
        });
      };

      extractMessages(root);

      setState({
        root,
        availableMessages: messages,
        selectedMessage: messages.length > 0 ? messages[0] : null,
        error: null,
      });

      // Save to localStorage
      localStorage.setItem('lastProtoFile', text);
      localStorage.setItem('lastFileName', file.name);
    } catch (error) {
      setState({
        root: null,
        availableMessages: [],
        selectedMessage: null,
        error: error instanceof Error ? error.message : 'Failed to parse .proto file',
      });
    }
  }, []);

  const loadProtoFromText = useCallback(async (text: string) => {
    try {
      const root = await newRoot();

      parse(text, root, { keepCase: false });

      console.log("Parsed options", root.parsedOptions, root, text);

      const messages: string[] = [];
      const extractMessages = (namespace: any, prefix = '') => {
        if (!namespace || !namespace.nested) return;

        Object.keys(namespace.nested).forEach((key) => {
          const item = namespace.nested[key];
          const fullName = prefix ? `${prefix}.${key}` : key;

          if (item instanceof Type) {
            messages.push(fullName);
          }

          if (item.nested) {
            extractMessages(item, fullName);
          }
        });
      };

      extractMessages(root);

      setState({
        root,
        availableMessages: messages,
        selectedMessage: messages.length > 0 ? messages[0] : null,
        error: null,
      });

      localStorage.setItem('lastProtoFile', text);
    } catch (error) {
      setState({
        root: null,
        availableMessages: [],
        selectedMessage: null,
        error: error instanceof Error ? error.message : 'Failed to parse .proto text',
      });
    }
  }, []);

  const selectMessage = useCallback((messageName: string) => {
    setState((prev) => ({
      ...prev,
      selectedMessage: messageName,
    }));
  }, []);

  const validateJson = useCallback(
    (jsonText: string): ValidationResult => {
      if (!state.root || !state.selectedMessage) {
        return { valid: false, error: 'No message type selected' };
      }

      try {
        const type = state.root.lookupType(state.selectedMessage);
        const obj = JSON.parse(jsonText);
        const error = type.verify(obj);

        if (error) {
          return { valid: false, error };
        }

        return { valid: true };
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Validation failed',
        };
      }
    },
    [state.root, state.selectedMessage]
  );

  const generateJsonSchema = useCallback(
    (messageName?: string): JsonSchema | null => {
      if (!state.root) return null;

      const targetMessage = messageName || state.selectedMessage;
      if (!targetMessage) return null;

      try {
        const type = state.root.lookupType(targetMessage);
        return convertTypeToJsonSchema(type);
      } catch (error) {
        console.error('Failed to generate JSON schema:', error);
        return null;
      }
    },
    [state.root, state.selectedMessage]
  );

  const clearProto = useCallback(() => {
    setState({
      root: null,
      availableMessages: [],
      selectedMessage: null,
      error: null,
    });
    localStorage.removeItem('lastProtoFile');
    localStorage.removeItem('lastFileName');
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    const savedProto = localStorage.getItem('lastProtoFile');
    if (savedProto) {
      loadProtoFromText(savedProto);
    }
  }, [loadProtoFromText]);

  return {
    ...state,
    loadProtoFile,
    loadProtoFromText,
    selectMessage,
    validateJson,
    generateJsonSchema,
    clearProto,
    loadFromLocalStorage,
  };
};

// Helper function to convert protobuf Type to JSON Schema
function convertTypeToJsonSchema(type: Type, root?: any): JsonSchema {
  const schema: JsonSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  Object.values(type.fields).forEach((field: Field) => {
    const fieldSchema = convertFieldToJsonSchema(field, type.parent || root);
    if (schema.properties) {
      schema.properties[field.name] = fieldSchema;
    }

    if (field.required && schema.required) {
      schema.required.push(field.name);
    }
  });

  if (schema.required && schema.required.length === 0) {
    delete schema.required;
  }

  return schema;
}

function convertFieldToJsonSchema(field: Field, root?: any): JsonSchema {
  // Handle repeated fields
  if (field.repeated) {
    return {
      type: 'array',
      items: convertFieldTypeToJsonSchema(field, root),
      description: `Repeated field: ${field.type}`,
    };
  }

  return convertFieldTypeToJsonSchema(field, root);
}

function convertFieldTypeToJsonSchema(field: Field, root?: any): JsonSchema {
  const protoType = field.type;

  // Map protobuf types to JSON schema types
  const typeMap: Record<string, string> = {
    double: 'number',
    float: 'number',
    int32: 'integer',
    int64: 'integer',
    uint32: 'integer',
    uint64: 'integer',
    sint32: 'integer',
    sint64: 'integer',
    fixed32: 'integer',
    fixed64: 'integer',
    sfixed32: 'integer',
    sfixed64: 'integer',
    bool: 'boolean',
    string: 'string',
    bytes: 'string',
  };

  if (typeMap[protoType]) {
    return {
      type: typeMap[protoType],
      description: `Type: ${protoType}`,
    };
  }

  // Try to resolve nested message types
  if (field.resolvedType) {
    const resolvedType = field.resolvedType;
    const fullName = (resolvedType as any).fullName || protoType;

    // Check if it's an Enum
    if ((resolvedType as any).values !== undefined) {
      const enumValues = Object.keys((resolvedType as any).values);
      return {
        type: 'string',
        enum: enumValues,
        description: `Enum: ${protoType}`,
      };
    }

    // Check if it's a google.protobuf well-known type
    if (resolvedType instanceof Type && fullName && fullName.startsWith('google.protobuf.')) {
      const typeName = fullName.replace('google.protobuf.', '');

      // Wrapper types - treat as the primitive value directly in JSON
      if (typeName.endsWith('Value')) {
        const wrapperTypeMap: Record<string, string> = {
          'StringValue': 'string',
          'Int32Value': 'integer',
          'Int64Value': 'integer',
          'UInt32Value': 'integer',
          'UInt64Value': 'integer',
          'FloatValue': 'number',
          'DoubleValue': 'number',
          'BoolValue': 'boolean',
          'BytesValue': 'string',
        };

        const mappedType = wrapperTypeMap[typeName];
        if (mappedType) {
          return {
            type: mappedType,
            description: `Wrapper: ${fullName}`,
          };
        }
      }

      // Other well-known types like Timestamp, Duration, etc.
      // For now treat as objects
    }

    // It's a nested message type - recursively convert it
    if (resolvedType instanceof Type) {
      return convertTypeToJsonSchema(resolvedType, root);
    }
  }

  // Fallback for unresolved types
  return {
    type: 'object',
    description: `Message type: ${protoType}`,
  };
}