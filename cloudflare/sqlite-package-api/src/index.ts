import { createDb } from '../../package-api/src/db';
import { R2MultipartWriter } from '../../package-api/src/r2-multipart-writer';
import { createMemoryDb } from './sqlite-builder';

// Classic worker: bindings exposed on globalThis
type Env = any;

function ok(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(
    typeof body === 'string' || body instanceof Uint8Array
      ? (body as any)
      : JSON.stringify(body),
    {
      status,
      headers: { 'Access-Control-Allow-Origin': '*', ...headers },
    }
  );
}

function err(message: string, status = 400): Response {
  return ok({ success: false, error: message }, status, {
    'Content-Type': 'application/json',
  });
}

// using wa-sqlite via wasm_modules

async function buildTextSqlite(
  env: Env,
  project: 'dev' | 'prod',
  textVersionId: string
) {
  const db = createDb(env, project);
  const syncMem = await createMemoryDb(env);
  const localMem = await createMemoryDb(env);
  const syncDb = {
    exec: (sql: string) => syncMem.api.exec(syncMem.db, sql),
    prepare: (sql: string) => syncMem.api.prepare_v3(syncMem.db, sql),
    runStmt: async (stmt: number, values: any[]) => {
      await syncMem.api.reset(stmt);
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        const idx = i + 1;
        if (v === null || v === undefined)
          await syncMem.api.bind_text(stmt, idx, '');
        else if (typeof v === 'number')
          await syncMem.api.bind_float(stmt, idx, v);
        else await syncMem.api.bind_text(stmt, idx, String(v));
      }
      await syncMem.api.step(stmt);
    },
    finalize: (stmt: number) => syncMem.api.finalize(stmt),
  } as const;
  const localDb = {
    exec: (sql: string) => localMem.api.exec(localMem.db, sql),
    prepare: (sql: string) => localMem.api.prepare_v3(localMem.db, sql),
    runStmt: async (stmt: number, values: any[]) => {
      await localMem.api.reset(stmt);
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        const idx = i + 1;
        if (v === null || v === undefined)
          await localMem.api.bind_text(stmt, idx, '');
        else if (typeof v === 'number')
          await localMem.api.bind_float(stmt, idx, v);
        else await localMem.api.bind_text(stmt, idx, String(v));
      }
      await localMem.api.step(stmt);
    },
    finalize: (stmt: number) => localMem.api.finalize(stmt),
  } as const;

  // PRAGMAs
  for (const d of [syncDb, localDb]) {
    d.exec(
      'PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA locking_mode=EXCLUSIVE; PRAGMA temp_store=MEMORY;'
    );
  }

  // Schema (no indexes)
  await syncDb.exec(`
    BEGIN;
    CREATE TABLE text_versions (id text primary key, language_entity_id text, bible_version_id text, name text, created_at text, updated_at text);
    CREATE TABLE verse_texts (id text primary key, verse_id text, text_version_id text, verse_text text, publish_status text, created_at text, updated_at text);
    COMMIT;`);

  await localDb.exec(`
    BEGIN;
    CREATE TABLE version_language_lookup (
      version_type text, version_id text, language_entity_id text,
      language_entity_name text, language_alias_name text, region_name text,
      created_at text, updated_at text
    );
    COMMIT;`);

  // Fetch + insert in pages
  const pageSize = 5000;
  const tvRows =
    await db`select * from text_versions where id = ${textVersionId}`;
  if (tvRows.length === 0) throw new Error('Text version not found');
  const tv = tvRows[0];
  {
    const stmt = await syncDb.prepare(
      'INSERT OR REPLACE INTO text_versions (id,language_entity_id,bible_version_id,name,created_at,updated_at) VALUES (?,?,?,?,?,?)'
    );
    await syncDb.runStmt(stmt, [
      tv.id,
      tv.language_entity_id,
      tv.bible_version_id,
      tv.name,
      tv.created_at,
      tv.updated_at,
    ]);
    await syncDb.finalize(stmt);
  }
  let page = 0;
  while (true) {
    const rows =
      await db`select * from verse_texts where text_version_id = ${textVersionId} and publish_status = 'published' order by verse_id limit ${pageSize} offset ${page * pageSize}`;
    if (!rows.length) break;
    const stmt = await syncDb.prepare(
      'INSERT OR REPLACE INTO verse_texts (id,verse_id,text_version_id,verse_text,publish_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?)'
    );
    await syncDb.exec('BEGIN');
    for (const r of rows) {
      await syncDb.runStmt(stmt, [
        r.id,
        r.verse_id,
        r.text_version_id,
        r.verse_text,
        r.publish_status,
        r.created_at,
        r.updated_at,
      ]);
    }
    await syncDb.exec('COMMIT');
    await syncDb.finalize(stmt);
    page++;
  }

  // Local lookup rows
  const lang =
    await db`select * from language_entities where id = ${tv.language_entity_id}`;
  const regions =
    await db`select r.* from regions r join language_entities_regions ler on ler.region_id = r.id where ler.language_entity_id = ${tv.language_entity_id}`;
  {
    const now = new Date().toISOString();
    const stmt = await localDb.prepare(
      'INSERT INTO version_language_lookup (version_type,version_id,language_entity_id,language_entity_name,language_alias_name,region_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)'
    );
    await localDb.exec('BEGIN');
    if (regions.length === 0) {
      await localDb.runStmt(stmt, [
        'text',
        tv.id,
        lang[0]?.id ?? '',
        lang[0]?.name ?? '',
        '',
        '',
        now,
        now,
      ]);
    } else {
      for (const r of regions)
        await localDb.runStmt(stmt, [
          'text',
          tv.id,
          lang[0]?.id ?? '',
          lang[0]?.name ?? '',
          '',
          r.name,
          now,
          now,
        ]);
    }
    await localDb.exec('COMMIT');
    await localDb.finalize(stmt);
  }

  // Export DBs
  const syncBuf = await syncMem.export();
  const localBuf = await localMem.export();
  await syncMem.close();
  await localMem.close();
  return { syncBuf, localBuf };
}

async function handleTextSqlite(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const project = url.searchParams.get('env') === 'dev' ? 'dev' : 'prod';
  const body = (await req.json().catch(() => ({}))) as any;
  if (!body.textVersionId) return err('textVersionId required');
  const { syncBuf, localBuf } = await buildTextSqlite(
    env,
    project,
    body.textVersionId
  );

  // Stream zip via multipart upload
  const bucket =
    project === 'dev'
      ? (globalThis as any).R2_MEDIA_DEV
      : (globalThis as any).R2_MEDIA_PROD;
  const key = `packages/sqlite/text/${body.textVersionId}.zip`;
  const upload = await bucket.createMultipartUpload(key, {
    httpMetadata: { contentType: 'application/zip' },
  });
  const sink = new R2MultipartWriter(upload);
  const { ZipStreamWriter } = await import('../../package-api/src/zip-stream');
  const z = new ZipStreamWriter({ write: (b: Uint8Array) => sink.write(b) });

  await z.addFile(
    'manifest.json',
    new TextEncoder().encode(
      JSON.stringify(
        {
          packageType: 'text-sqlite',
          textVersionId: body.textVersionId,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    )
  );
  await z.addFile('syncable.db', new Uint8Array(syncBuf));
  await z.addFile('local_only.db', new Uint8Array(localBuf));
  await z.finalize();
  await sink.close();

  return ok(
    {
      success: true,
      download: `/api/v1/sqlite/text/${body.textVersionId}/download?env=${project}`,
    },
    200,
    { 'Content-Type': 'application/json' }
  );
}

async function handleDownload(
  _req: Request,
  env: Env,
  project: 'dev' | 'prod',
  textVersionId: string
): Promise<Response> {
  const bucket =
    project === 'dev'
      ? (globalThis as any).R2_MEDIA_DEV
      : (globalThis as any).R2_MEDIA_PROD;
  const key = `packages/sqlite/text/${textVersionId}.zip`;
  const obj = await bucket.get(key);
  if (!obj) return err('Not found', 404);
  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set(
    'Content-Disposition',
    `attachment; filename="text-sqlite-${textVersionId}.zip"`
  );
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(obj.body, { status: 200, headers });
}

async function router(req: Request, env: Env): Promise<Response> {
  if (req.method === 'OPTIONS')
    return ok('', 200, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/+/, '').replace(/^api\//, '');
  if (req.method === 'GET' && path === 'v1/sqlite/health') {
    try {
      const mem = await createMemoryDb({});
      await mem.api.exec(mem.db, 'select 1');
      const buf = await mem.export();
      await mem.close();
      return ok({ success: true, size: buf.byteLength }, 200, {
        'Content-Type': 'application/json',
      });
    } catch (e) {
      return err(e instanceof Error ? e.message : String(e), 500);
    }
  }
  if (req.method === 'POST' && path === 'v1/sqlite/text')
    return handleTextSqlite(req, env);
  if (
    req.method === 'GET' &&
    /^v1\/sqlite\/text\/[^/]+\/download$/.test(path)
  ) {
    const textVersionId = path.split('/')[3];
    const project = url.searchParams.get('env') === 'dev' ? 'dev' : 'prod';
    return handleDownload(req, env, project as any, textVersionId);
  }
  return err('Not found', 404);
}

self.addEventListener('fetch', (event: FetchEvent) => {
  event.respondWith(
    router(event.request, globalThis as any as Env).catch(e =>
      err(e instanceof Error ? e.message : String(e), 500)
    )
  );
});
