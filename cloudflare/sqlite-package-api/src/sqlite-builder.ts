import * as SQLite from '@powersync/wa-sqlite';
// Provided by wrangler [wasm_modules] in classic (service-worker) format
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const SQLITE_WASM: WebAssembly.Module | ArrayBuffer;

export async function createMemoryDb(_env: any): Promise<{
  db: number;
  api: SQLiteAPI;
  close: () => Promise<void>;
  export(): Promise<Uint8Array>;
}> {
  const api = (SQLite as any).Factory(
    (globalThis as any).SQLITE_WASM ?? SQLITE_WASM
  ) as unknown as SQLiteAPI;
  const db = await api.open_v2(':memory:');
  const run = (sql: string) => api.exec(db, sql);
  await run('PRAGMA journal_mode=OFF;');
  await run('PRAGMA synchronous=OFF;');
  await run('PRAGMA locking_mode=EXCLUSIVE;');
  await run('PRAGMA temp_store=MEMORY;');
  return {
    db,
    api,
    close: () => api.close(db),
    export: async () => new Uint8Array(await api.export(db)),
  };
}

export type SQLiteAPI = {
  open_v2(filename: string): Promise<number>;
  close(db: number): Promise<void>;
  exec(db: number, sql: string): Promise<void>;
  prepare_v3(db: number, sql: string): Promise<number>;
  bind_text(stmt: number, index: number, value: string): Promise<void>;
  bind_int(stmt: number, index: number, value: number): Promise<void>;
  bind_float(stmt: number, index: number, value: number): Promise<void>;
  step(stmt: number): Promise<number>;
  reset(stmt: number): Promise<void>;
  finalize(stmt: number): Promise<void>;
  export(db: number): Promise<ArrayBuffer>;
};
