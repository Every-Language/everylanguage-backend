export interface Env {
  R2_MEDIA_DEV: R2Bucket;
  R2_MEDIA_PROD: R2Bucket;
  PG_DEV: Hyperdrive;
  PG_PROD: Hyperdrive;
}

type PackageKind = 'audio' | 'text';

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function errorJson(message: string, status = 400): Response {
  return okJson({ success: false, error: message }, status);
}

import { runTextPackaging, buildTextPackageZip } from './text-packager';
import { runAudioPackaging } from './audio-packager';

async function handleCreateJob(
  req: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const { pathname, searchParams } = new URL(req.url);
  const isText = pathname.endsWith('/text');
  const isAudio = pathname.endsWith('/audio');
  if (!isText && !isAudio) return errorJson('Unsupported path', 404);

  const body = (await req.json().catch(() => ({}))) as any;
  const project = searchParams.get('env') === 'dev' ? 'dev' : 'prod';

  // Validate
  if (isText && !body.textVersionId) return errorJson('textVersionId required');
  if (isAudio && !body.audioVersionId)
    return errorJson('audioVersionId required');

  // Create job id
  const jobId = crypto.randomUUID();
  const now = new Date().toISOString();

  const job = {
    id: jobId,
    kind: (isText ? 'text' : 'audio') as PackageKind,
    createdAt: now,
    status: 'queued',
    request: body,
    project,
  } as any;

  const bucket = project === 'dev' ? env.R2_MEDIA_DEV : env.R2_MEDIA_PROD;
  await bucket.put(`packages/jobs/${jobId}.json`, JSON.stringify(job), {
    httpMetadata: { contentType: 'application/json' },
  });

  // Schedule packaging in background so response can return immediately
  if (isText) {
    ctx.waitUntil(
      (async () => {
        try {
          await runTextPackaging(env as any, project as 'dev' | 'prod', jobId, {
            textVersionId: body.textVersionId,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const stack =
            err instanceof Error && err.stack ? err.stack : undefined;
          console.error(
            `[text-packaging-failed] jobId=${jobId} msg=${msg}${stack ? ` stack=${stack}` : ''}`
          );
          const obj = await bucket.get(`packages/jobs/${jobId}.json`);
          if (obj) {
            const j = await obj.json<any>();
            j.status = 'failed';
            j.error = msg;
            await bucket.put(`packages/jobs/${jobId}.json`, JSON.stringify(j), {
              httpMetadata: { contentType: 'application/json' },
            });
          }
        }
      })()
    );
  } else if (isAudio) {
    ctx.waitUntil(
      (async () => {
        try {
          await runAudioPackaging(
            env as any,
            project as 'dev' | 'prod',
            jobId,
            {
              audioVersionId: body.audioVersionId,
              maxSizeMB: body.maxSizeMB,
              books: body.books,
              chapters: body.chapters,
            }
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const stack =
            err instanceof Error && err.stack ? err.stack : undefined;
          console.error(
            `[audio-packaging-failed] jobId=${jobId} msg=${msg}${stack ? ` stack=${stack}` : ''}`
          );
          const obj = await bucket.get(`packages/jobs/${jobId}.json`);
          if (obj) {
            const j = await obj.json<any>();
            j.status = 'failed';
            j.error = msg;
            await bucket.put(`packages/jobs/${jobId}.json`, JSON.stringify(j), {
              httpMetadata: { contentType: 'application/json' },
            });
          }
        }
      })()
    );
  }

  return okJson({ success: true, jobId });
}

async function handleGetStatus(
  _req: Request,
  env: Env,
  jobId: string
): Promise<Response> {
  // Try dev first, then prod
  let obj = await env.R2_MEDIA_DEV.get(`packages/jobs/${jobId}.json`);
  let bucket: R2Bucket | null = env.R2_MEDIA_DEV;
  if (!obj) {
    obj = await env.R2_MEDIA_PROD.get(`packages/jobs/${jobId}.json`);
    bucket = env.R2_MEDIA_PROD;
  }
  if (!obj || !bucket) return errorJson('Job not found', 404);

  const job = await obj.json<any>();
  const artifact = await bucket.get(`packages/artifacts/${jobId}.zip`);
  const ready = Boolean(artifact);
  return okJson({
    success: true,
    status: ready ? 'ready' : job.status,
    ready,
    error: job.error,
  });
}

async function handleDownload(
  _req: Request,
  env: Env,
  jobId: string
): Promise<Response> {
  let obj = await env.R2_MEDIA_DEV.get(`packages/jobs/${jobId}.json`);
  let bucket: R2Bucket | null = env.R2_MEDIA_DEV;
  if (!obj) {
    obj = await env.R2_MEDIA_PROD.get(`packages/jobs/${jobId}.json`);
    bucket = env.R2_MEDIA_PROD;
  }
  if (!obj || !bucket) return errorJson('Job not found', 404);

  const artifact = await bucket.get(`packages/artifacts/${jobId}.zip`);
  if (!artifact) return errorJson('Artifact not ready', 409);

  const headers = new Headers();
  headers.set('Content-Type', 'application/zip');
  headers.set('Content-Disposition', `attachment; filename="${jobId}.zip"`);
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(artifact.body, { status: 200, headers });
}

async function router(
  req: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/+/, '').replace(/^api\//, '');

  if (req.method === 'POST' && path === 'v1/packages/text') {
    const body = (await req.json().catch(() => ({}))) as any;
    const project =
      new URL(req.url).searchParams.get('env') === 'dev' ? 'dev' : 'prod';
    if (!body.textVersionId) return errorJson('textVersionId required');
    try {
      const zip = await buildTextPackageZip(
        env as any,
        project as 'dev' | 'prod',
        { textVersionId: body.textVersionId }
      );
      const headers = new Headers();
      headers.set('Content-Type', 'application/zip');
      headers.set(
        'Content-Disposition',
        `attachment; filename="text-${body.textVersionId}.zip"`
      );
      headers.set('Access-Control-Allow-Origin', '*');
      return new Response(zip, { status: 200, headers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return errorJson(`Failed to build text package: ${msg}`, 500);
    }
  }
  if (req.method === 'POST' && path === 'v1/packages/audio')
    return handleCreateJob(req, env, ctx);
  if (req.method === 'GET' && /^v1\/packages\/[^/]+\/status$/.test(path)) {
    const jobId = path.split('/')[2];
    return handleGetStatus(req, env, jobId);
  }
  if (req.method === 'GET' && /^v1\/packages\/[^/]+\/download$/.test(path)) {
    const jobId = path.split('/')[2];
    return handleDownload(req, env, jobId);
  }

  return errorJson('Not found', 404);
}

export default {
  fetch: (req: Request, env: Env, ctx: ExecutionContext) =>
    router(req, env, ctx).catch(err => {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return errorJson(`Internal error: ${message}`, 500);
    }),
};
