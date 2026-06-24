// Helpers for fields that were Postgres String[] columns and are now stored as
// JSON arrays on MySQL. Prisma types JSON columns as `JsonValue`, so callers use
// this to safely read them back as a string[] (tolerating null / unexpected shapes).
export function toStrArr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}
