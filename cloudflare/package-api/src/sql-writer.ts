export function sqlHeader(): string {
  return ['PRAGMA foreign_keys=ON;', 'BEGIN TRANSACTION;'].join('\n') + '\n';
}

export function sqlFooter(): string {
  return 'COMMIT;\n';
}

export function insertOrReplace(
  table: string,
  row: Record<string, unknown>
): string {
  const cols = Object.keys(row);
  const values = cols.map(c => sqlValue(row[c]));
  return `INSERT OR REPLACE INTO ${table} (${cols.join(',')}) VALUES (${values.join(',')});`;
}

export function insertIgnore(
  table: string,
  row: Record<string, unknown>
): string {
  const cols = Object.keys(row);
  const values = cols.map(c => sqlValue(row[c]));
  return `INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${values.join(',')});`;
}

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (typeof v === 'boolean') return v ? '1' : '0';
  // Escape single quotes
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}
