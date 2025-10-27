import { Type, Field, Enum, OneOf, MapField } from 'protobufjs';

/**
 * Generates a human-readable .proto definition from a protobuf Type
 */
export function generateMessageDefinition(type: Type, indent = 0): string {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  // Message header
  lines.push(`${indentStr}message ${type.name} {`);

  // Nested enums
  if (type.nested) {
    Object.values(type.nested).forEach((nested) => {
      if (nested instanceof Enum) {
        lines.push('');
        lines.push(...generateEnumDefinition(nested, indent + 1));
      }
    });
  }

  // Nested messages
  if (type.nested) {
    Object.values(type.nested).forEach((nested) => {
      if (nested instanceof Type) {
        lines.push('');
        lines.push(generateMessageDefinition(nested, indent + 1));
      }
    });
  }

  // OneOf fields
  if (type.oneofsArray && type.oneofsArray.length > 0) {
    type.oneofsArray.forEach((oneof: OneOf) => {
      lines.push('');
      lines.push(`${indentStr}  oneof ${oneof.name} {`);
      oneof.fieldsArray.forEach((field) => {
        lines.push(...generateFieldDefinition(field, indent + 2));
      });
      lines.push(`${indentStr}  }`);
    });
  }

  // Regular fields (excluding oneof fields)
  const regularFields = Object.values(type.fields).filter(
    (field) => !field.partOf
  );

  if (regularFields.length > 0) {
    if (type.oneofsArray && type.oneofsArray.length > 0) {
      lines.push('');
    }
    regularFields.forEach((field) => {
      lines.push(...generateFieldDefinition(field, indent + 1));
    });
  }

  lines.push(`${indentStr}}`);

  return lines.join('\n');
}

/**
 * Generates enum definition
 */
function generateEnumDefinition(enumType: Enum, indent = 0): string[] {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  lines.push(`${indentStr}enum ${enumType.name} {`);

  Object.entries(enumType.values).forEach(([name, value]) => {
    lines.push(`${indentStr}  ${name} = ${value};`);
  });

  lines.push(`${indentStr}}`);

  return lines;
}

/**
 * Generates field definition
 */
function generateFieldDefinition(field: Field, indent = 0): string[] {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  // Handle map fields
  if (field instanceof MapField) {
    const mapField = field as MapField;
    lines.push(
      `${indentStr}map<${mapField.keyType}, ${mapField.type}> ${field.name} = ${field.id};`
    );
    return lines;
  }

  // Build field line
  let fieldLine = indentStr;

  // Repeated modifier
  if (field.repeated) {
    fieldLine += 'repeated ';
  }

  // Optional/required (proto2 style, protobufjs may mark some fields)
  if (field.required) {
    fieldLine += 'required ';
  } else if (field.optional && !field.partOf) {
    // In proto3, 'optional' keyword is used for explicit optional fields
    fieldLine += 'optional ';
  }

  // Field type
  fieldLine += `${field.type} `;

  // Field name
  fieldLine += `${field.name} = ${field.id}`;

  // Field options
  const options: string[] = [];

  if (field.defaultValue !== undefined && field.defaultValue !== null) {
    const defaultStr =
      typeof field.defaultValue === 'string'
        ? `"${field.defaultValue}"`
        : field.defaultValue;
    options.push(`default = ${defaultStr}`);
  }

  if ((field as any).packed !== undefined) {
    options.push(`packed = ${(field as any).packed}`);
  }

  if (options.length > 0) {
    fieldLine += ` [${options.join(', ')}]`;
  }

  fieldLine += ';';

  // Add comment if field has a comment
  if (field.comment) {
    lines.push(`${indentStr}// ${field.comment}`);
  }

  lines.push(fieldLine);

  return lines;
}

/**
 * Generates full proto definition including dependencies
 */
export function generateFullProtoDefinition(
  type: Type,
  includeSyntax = true
): string {
  const lines: string[] = [];

  if (includeSyntax) {
    lines.push('syntax = "proto3";');
    lines.push('');
  }

  // Add package if exists
  const packageName = getPackageName(type);
  if (packageName) {
    lines.push(`package ${packageName};`);
    lines.push('');
  }

  // Generate message definition
  lines.push(generateMessageDefinition(type, 0));

  return lines.join('\n');
}

/**
 * Extracts package name from type
 */
function getPackageName(type: Type): string | null {
  const fullName = (type as any).fullName || '';
  const parts = fullName.split('.');

  if (parts.length > 1) {
    // Remove the message name to get package
    return parts.slice(0, -1).join('.');
  }

  return null;
}
