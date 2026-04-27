import { Type, Field, Enum, OneOf, MapField, Namespace, ReflectionObject } from 'protobufjs';

export function generateMessageDefinition(type: Type, indent = 0): string {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  lines.push(`${indentStr}message ${type.name} {`);

  if (type.nested) {
    Object.values(type.nested).forEach((nested) => {
      if (nested instanceof Enum) {
        lines.push('');
        lines.push(...generateEnumDefinition(nested, indent + 1));
      }
    });

    Object.values(type.nested).forEach((nested) => {
      if (nested instanceof Type) {
        lines.push('');
        lines.push(generateMessageDefinition(nested, indent + 1));
      }
    });
  }

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

  const regularFields = Object.values(type.fields).filter((f) => !f.partOf);
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

function generateFieldDefinition(field: Field, indent = 0): string[] {
  const lines: string[] = [];
  const indentStr = '  '.repeat(indent);

  if (field.comment) {
    lines.push(`${indentStr}// ${field.comment}`);
  }

  if (field instanceof MapField) {
    lines.push(`${indentStr}map<${field.keyType}, ${field.type}> ${field.name} = ${field.id};`);
    return lines;
  }

  let fieldLine = indentStr;
  if (field.repeated) fieldLine += 'repeated ';
  if (field.required) fieldLine += 'required ';

  fieldLine += `${field.type} ${field.name} = ${field.id};`;
  lines.push(fieldLine);
  return lines;
}

// Collect every named type referenced by `type` (transitive) excluding nested
// types defined inside `type` itself and well-known google.protobuf.* types.
function collectReferencedTypes(type: Type): { types: Type[]; enums: Enum[] } {
  // Force lazy field-type resolution so `field.resolvedType` is populated.
  try { (type.root as any).resolveAll(); } catch { /* ignore */ }

  const seenTypes = new Map<string, Type>();
  const seenEnums = new Map<string, Enum>();
  const queue: Type[] = [type];
  const rootFullName = (type as any).fullName as string;

  // Names of types nested inside `type` — skip them, they are rendered inline.
  const nestedNames = new Set<string>();
  if (type.nested) {
    for (const k of Object.keys(type.nested)) {
      const n = type.nested[k];
      const fn = (n as any).fullName as string | undefined;
      if (fn) nestedNames.add(fn);
    }
  }

  while (queue.length) {
    const t = queue.shift()!;
    for (const field of Object.values(t.fields)) {
      const resolved = field.resolvedType;
      if (!resolved) continue;
      const fullName = (resolved as any).fullName as string;
      if (!fullName) continue;
      if (fullName.startsWith('.google.protobuf.') || fullName.startsWith('google.protobuf.')) continue;
      if (fullName === rootFullName) continue;
      if (nestedNames.has(fullName)) continue;

      if (resolved instanceof Type) {
        if (!seenTypes.has(fullName)) {
          seenTypes.set(fullName, resolved);
          queue.push(resolved);
        }
      } else if (resolved instanceof Enum) {
        if (!seenEnums.has(fullName)) {
          seenEnums.set(fullName, resolved);
        }
      }
    }
  }

  return { types: Array.from(seenTypes.values()), enums: Array.from(seenEnums.values()) };
}

function getPackageOf(obj: ReflectionObject): string | null {
  let parent: ReflectionObject | null = obj.parent;
  const parts: string[] = [];
  while (parent && (parent as Namespace).name !== undefined && (parent as any).fullName !== '') {
    if (parent.name) parts.unshift(parent.name);
    parent = parent.parent;
  }
  return parts.length ? parts.join('.') : null;
}

export function generateFullProtoDefinition(type: Type, includeSyntax = true): string {
  const lines: string[] = [];

  if (includeSyntax) {
    lines.push('syntax = "proto3";');
    lines.push('');
  }

  const rootPackage = getPackageOf(type);
  if (rootPackage) {
    lines.push(`package ${rootPackage};`);
    lines.push('');
  }

  lines.push(generateMessageDefinition(type, 0));

  const { types, enums } = collectReferencedTypes(type);
  if (types.length === 0 && enums.length === 0) {
    return lines.join('\n');
  }

  // Group referenced types/enums by package so the output reflects the
  // file structure of the original .proto sources.
  const byPackage = new Map<string, { types: Type[]; enums: Enum[] }>();
  for (const t of types) {
    const pkg = getPackageOf(t) || '';
    if (!byPackage.has(pkg)) byPackage.set(pkg, { types: [], enums: [] });
    byPackage.get(pkg)!.types.push(t);
  }
  for (const e of enums) {
    const pkg = getPackageOf(e) || '';
    if (!byPackage.has(pkg)) byPackage.set(pkg, { types: [], enums: [] });
    byPackage.get(pkg)!.enums.push(e);
  }

  lines.push('');
  lines.push('// ─── Referenced types ───────────────────────────────────────');

  for (const [pkg, group] of byPackage) {
    lines.push('');
    lines.push(pkg ? `// package ${pkg}` : '// (default package)');
    for (const e of group.enums) {
      lines.push('');
      lines.push(...generateEnumDefinition(e, 0));
    }
    for (const t of group.types) {
      lines.push('');
      lines.push(generateMessageDefinition(t, 0));
    }
  }

  return lines.join('\n');
}
