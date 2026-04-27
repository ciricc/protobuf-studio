import { Type, util } from 'protobufjs';

const INT64_TYPES = new Set([
  'int64',
  'uint64',
  'sint64',
  'fixed64',
  'sfixed64',
]);

const DECIMAL_RE = /^-?\d+$/;

// protobufjs Type.toObject decodes 64-bit integers as decimal strings (longs:String)
// to preserve precision. Type.verify rejects those strings even though Type.fromObject
// would happily accept them. Coerce decimal strings back to numbers/BigInts for verify+encode.
export function normalizeInt64Fields(obj: any, type: Type): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === 'object' && item !== null ? normalizeInt64Fields(item, type) : item
    );
  }

  const result: any = {};

  Object.keys(obj).forEach((key) => {
    const field = type.fields[key];
    const value = obj[key];

    if (!field) {
      result[key] = value;
      return;
    }

    if (INT64_TYPES.has(field.type)) {
      result[key] = coerceInt64(value);
      return;
    }

    if (field.resolvedType instanceof Type && typeof value === 'object' && value !== null) {
      if (field.repeated && Array.isArray(value)) {
        result[key] = value.map((item: any) =>
          typeof item === 'object' && item !== null
            ? normalizeInt64Fields(item, field.resolvedType as Type)
            : item
        );
      } else {
        result[key] = normalizeInt64Fields(value, field.resolvedType as Type);
      }
      return;
    }

    result[key] = value;
  });

  return result;
}

function coerceInt64(value: any): any {
  if (typeof value !== 'string') return value;
  if (!DECIMAL_RE.test(value)) return value;
  const asNumber = Number(value);
  if (Number.isSafeInteger(asNumber)) return asNumber;
  // Beyond MAX_SAFE_INTEGER use a Long so protobufjs verify/encode preserve precision.
  const Long = (util as any).Long;
  if (Long && typeof Long.fromString === 'function') {
    return Long.fromString(value);
  }
  return value;
}
