import { useState, useCallback } from 'react';
import { parse, Type, Field, Root } from 'protobufjs';
import type { ProtoState, ValidationResult, JsonSchema } from '../types/proto';
import { generateFullProtoDefinition } from '../utils/generateProtoDefinition';
import { normalizeEnumValues } from '../utils/normalizeEnumValues';

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

// Helper function to extract import statements from proto file text
function extractImportsFromText(text: string): string[] {
  const imports: string[] = [];
  const importRegex = /^\s*import\s+["']([^"']+)["']\s*;/gm;
  let match;

  while ((match = importRegex.exec(text)) !== null) {
    const importPath = match[1];
    // Пропускаем google well-known types
    if (!importPath.startsWith('google/protobuf/')) {
      imports.push(importPath);
    }
  }

  console.log('[extractImportsFromText] Found imports:', imports);
  return imports;
}

// Helper function to detect unresolved imports
function detectUnresolvedImports(
  loadedFilesContent: Map<string, string>,
  loadedFilesPaths: Set<string>
): string[] {
  const unresolved = new Set<string>();

  console.log('[detectUnresolvedImports] Loaded files:', Array.from(loadedFilesPaths));

  // Проверяем импорты в каждом загруженном файле
  for (const [filePath, content] of loadedFilesContent.entries()) {
    console.log(`[detectUnresolvedImports] Checking file: ${filePath}`);
    const imports = extractImportsFromText(content);

    for (const importPath of imports) {
      console.log(`[detectUnresolvedImports] Checking import: ${importPath}`);

      // Проверяем, загружен ли этот импорт
      if (!loadedFilesPaths.has(importPath)) {
        // Пробуем нормализованный путь
        const normalized = normalizeImportPath(filePath, importPath);
        console.log(`[detectUnresolvedImports] Normalized path: ${normalized}`);

        if (!loadedFilesPaths.has(normalized)) {
          console.log(`[detectUnresolvedImports] ❌ Unresolved: ${importPath}`);
          unresolved.add(importPath);
        } else {
          console.log(`[detectUnresolvedImports] ✅ Found normalized: ${normalized}`);
        }
      } else {
        console.log(`[detectUnresolvedImports] ✅ Already loaded: ${importPath}`);
      }
    }
  }

  const unresolvedArray = Array.from(unresolved);
  console.log('[detectUnresolvedImports] Final unresolved imports:', unresolvedArray);
  return unresolvedArray;
}

// Helper function to normalize import paths
function normalizeImportPath(origin: string, target: string): string {
  if (target.startsWith('./') || target.startsWith('../')) {
    const originParts = origin.split('/');
    originParts.pop(); // remove filename
    const targetParts = target.split('/');

    for (const part of targetParts) {
      if (part === '..') {
        originParts.pop();
      } else if (part !== '.') {
        originParts.push(part);
      }
    }

    return originParts.join('/');
  }
  return target;
}

export const useProtobuf = () => {
  const [state, setState] = useState<ProtoState>({
    root: null,
    availableMessages: [],
    selectedMessage: null,
    error: null,
    loadedFiles: new Map<string, string>(),
    unresolvedImports: [],
    mainFile: null,
  });

  // Общая функция для парсинга файлов
  const parseFiles = useCallback(
    async (
      filesMap: Map<string, string>,
      mainFileName: string | null,
      currentSelectedMessage: string | null
    ) => {
      console.log('[parseFiles] Starting parse with files:', Array.from(filesMap.keys()));
      console.log('[parseFiles] Main file:', mainFileName);

      const root = await newRoot();

      // Устанавливаем resolvePath для разрешения импортов
      root.resolvePath = (origin: string, target: string) => {
        console.log(`[resolvePath] origin="${origin}", target="${target}"`);

        if (filesMap.has(target)) {
          console.log(`[resolvePath] ✅ Found direct: ${target}`);
          return target;
        }

        const normalized = normalizeImportPath(origin, target);
        console.log(`[resolvePath] Normalized: ${normalized}`);

        if (filesMap.has(normalized)) {
          console.log(`[resolvePath] ✅ Found normalized: ${normalized}`);
          return normalized;
        }

        console.log(`[resolvePath] ❌ Not found: ${target}`);
        return target;
      };

      // Парсим все загруженные файлы
      for (const [path, content] of filesMap.entries()) {
        console.log(`[parseFiles] Parsing file: ${path}`);
        try {
          parse(content, root, { keepCase: false });
          console.log(`[parseFiles] ✅ Successfully parsed: ${path}`);
        } catch (parseError) {
          console.error(`[parseFiles] ❌ Failed to parse ${path}:`, parseError);
        }
      }

      // Извлекаем сообщения
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

      // Обнаруживаем неразрешенные импорты
      const unresolved = detectUnresolvedImports(filesMap, new Set(filesMap.keys()));

      return {
        root,
        availableMessages: messages,
        selectedMessage: currentSelectedMessage || (messages.length > 0 ? messages[0] : null),
        error: null,
        loadedFiles: filesMap,
        unresolvedImports: unresolved,
        mainFile: mainFileName,
      };
    },
    []
  );

  const loadProtoFile = useCallback(
    async (file: File, importPath?: string) => {
      try {
        const text = await file.text();
        const fileName = importPath || file.name;

        // Создаем новый набор загруженных файлов
        const newLoadedFiles = new Map(state.loadedFiles);
        newLoadedFiles.set(fileName, text);

        // Определяем главный файл
        const mainFileName = state.mainFile || fileName;

        // Используем общую функцию парсинга
        const newState = await parseFiles(newLoadedFiles, mainFileName, state.selectedMessage);

        setState(newState);

        // Сохраняем в localStorage
        localStorage.setItem(
          'protoFiles',
          JSON.stringify(Array.from(newLoadedFiles.entries()))
        );
        localStorage.setItem('mainFile', mainFileName);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to parse .proto file',
        }));
      }
    },
    [state.loadedFiles, state.mainFile, state.selectedMessage, parseFiles]
  );

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
        loadedFiles: new Map([['text-input.proto', text]]),
        unresolvedImports: [],
        mainFile: 'text-input.proto',
      });

      localStorage.setItem('lastProtoFile', text);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        root: null,
        availableMessages: [],
        selectedMessage: null,
        error: error instanceof Error ? error.message : 'Failed to parse .proto text',
      }));
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

        // Convert enum string values to numbers for validation
        // protobufjs verify() expects numeric enum values
        const normalizedObj = normalizeEnumValues(obj, type);

        const error = type.verify(normalizedObj);

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
        // Track visited types to prevent infinite recursion
        const visitedTypes = new Set<string>();
        return convertTypeToJsonSchema(type, undefined, visitedTypes);
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
      loadedFiles: new Map(),
      unresolvedImports: [],
      mainFile: null,
    });
    localStorage.removeItem('protoFiles');
    localStorage.removeItem('mainFile');
    localStorage.removeItem('lastProtoFile');
    localStorage.removeItem('lastFileName');
  }, []);

  const loadFromLocalStorage = useCallback(async () => {
    const savedFiles = localStorage.getItem('protoFiles');
    const savedMainFile = localStorage.getItem('mainFile');

    if (savedFiles) {
      try {
        const filesArray = JSON.parse(savedFiles) as [string, string][];
        const filesMap = new Map(filesArray);

        // Используем общую функцию парсинга
        const newState = await parseFiles(filesMap, savedMainFile, null);
        setState(newState);
      } catch (error) {
        console.error('Failed to restore proto files:', error);
        // Fallback to old format
        const savedProto = localStorage.getItem('lastProtoFile');
        if (savedProto) {
          loadProtoFromText(savedProto);
        }
      }
    }
  }, [parseFiles, loadProtoFromText]);

  const getMessageDefinition = useCallback(
    (messageName?: string): string | null => {
      if (!state.root) return null;

      const targetMessage = messageName || state.selectedMessage;
      if (!targetMessage) return null;

      try {
        const type = state.root.lookupType(targetMessage);
        return generateFullProtoDefinition(type, true);
      } catch (error) {
        console.error('Failed to generate proto definition:', error);
        return null;
      }
    },
    [state.root, state.selectedMessage]
  );

  return {
    ...state,
    loadProtoFile,
    loadProtoFromText,
    selectMessage,
    validateJson,
    generateJsonSchema,
    getMessageDefinition,
    clearProto,
    loadFromLocalStorage,
  };
};

// Helper function to convert protobuf Type to JSON Schema
function convertTypeToJsonSchema(type: Type, root?: any, visitedTypes?: Set<string>): JsonSchema {
  // Initialize visitedTypes if not provided (for backward compatibility)
  if (!visitedTypes) {
    visitedTypes = new Set<string>();
  }

  // Get a unique identifier for this type
  const typeId = (type as any).fullName || type.name;

  // Check for circular reference
  if (visitedTypes.has(typeId)) {
    // Return a simple reference schema to break the cycle
    return {
      type: 'object',
      description: `Circular reference to ${typeId}`,
    };
  }

  // Mark this type as visited
  visitedTypes.add(typeId);

  const schema: JsonSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  // Track which fields are part of oneof groups
  const oneofFields = new Set<string>();

  // Process oneof groups - they need special handling in JSON Schema
  if (type.oneofsArray && type.oneofsArray.length > 0) {
    type.oneofsArray.forEach((oneof) => {
      // Mark all fields in this oneof group
      oneof.fieldsArray.forEach((field) => {
        oneofFields.add(field.name);
      });

      // For each field in the oneof, add it to properties with a special description
      oneof.fieldsArray.forEach((field) => {
        const fieldSchema = convertFieldToJsonSchema(field, type.parent || root, visitedTypes);

        // Add description indicating this is part of a oneof group
        const oneofDescription = `[oneof ${oneof.name}] Only one field from this group can be set`;
        if (fieldSchema.description) {
          fieldSchema.description = `${oneofDescription}. ${fieldSchema.description}`;
        } else {
          fieldSchema.description = oneofDescription;
        }

        if (schema.properties) {
          schema.properties[field.name] = fieldSchema;
        }
      });
    });
  }

  // Process regular fields (excluding oneof fields - they're already processed)
  Object.values(type.fields).forEach((field: Field) => {
    // Skip fields that are part of oneof groups (already processed above)
    if (!oneofFields.has(field.name)) {
      const fieldSchema = convertFieldToJsonSchema(field, type.parent || root, visitedTypes);
      if (schema.properties) {
        schema.properties[field.name] = fieldSchema;
      }

      if (field.required && schema.required) {
        schema.required.push(field.name);
      }
    }
  });

  if (schema.required && schema.required.length === 0) {
    delete schema.required;
  }

  // Remove from visited after processing (allow same type in different branches)
  visitedTypes.delete(typeId);

  return schema;
}

function convertFieldToJsonSchema(field: Field, root?: any, visitedTypes?: Set<string>): JsonSchema {
  // Handle repeated fields
  if (field.repeated) {
    return {
      type: 'array',
      items: convertFieldTypeToJsonSchema(field, root, visitedTypes),
      description: `Repeated field: ${field.type}`,
    };
  }

  return convertFieldTypeToJsonSchema(field, root, visitedTypes);
}

function convertFieldTypeToJsonSchema(field: Field, root?: any, visitedTypes?: Set<string>): JsonSchema {
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
      const enumObj = (resolvedType as any).values;
      const enumNames = Object.keys(enumObj);
      const enumNumbers = Object.values(enumObj);

      // Protobuf JSON allows both string names and numeric values for enums
      // Create a schema that accepts either
      return {
        oneOf: [
          {
            type: 'integer',
            enum: enumNumbers,
            description: `Enum numeric value: ${protoType}`,
          },
          {
            type: 'string',
            enum: enumNames,
            description: `Enum string value: ${protoType}`,
          },
        ],
        description: `Enum: ${protoType} (accepts both string names and numeric values)`,
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
      return convertTypeToJsonSchema(resolvedType, root, visitedTypes);
    }
  }

  // Fallback for unresolved types
  return {
    type: 'object',
    description: `Message type: ${protoType}`,
  };
}