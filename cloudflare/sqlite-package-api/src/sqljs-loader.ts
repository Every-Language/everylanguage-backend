export default async function initSqlJsDynamic(): Promise<any> {
  // Load UMD bundle and evaluate in a faux CommonJS env
  const res = await fetch(
    'https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/sql-wasm.js'
  );
  if (!res.ok) throw new Error(`Failed to fetch sql.js: ${res.status}`);
  const code = await res.text();
  const sandbox: Record<string, unknown> = {};
  (sandbox as any).exports = {};
  (sandbox as any).module = { exports: (sandbox as any).exports };
  // Provide minimal globals referenced by UMD
  const fn = new Function(
    'globalThis',
    'exports',
    'module',
    code + '\nreturn module.exports;'
  );
  const mod = fn(globalThis, (sandbox as any).exports, (sandbox as any).module);
  const init = (mod as any).default || mod;
  return await init({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/sql.js@1.10.2/dist/${file}`,
  });
}
