export interface Env {
  CDN_SIGNING_SECRET: string;
  R2_MEDIA_DEV: R2Bucket;
  R2_MEDIA_PROD: R2Bucket;
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data)
  );
  return toHex(sig);
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const objectKey = url.pathname.replace(/^\//, '');
  const exp = parseInt(url.searchParams.get('exp') || '0', 10);
  const token = url.searchParams.get('token') || '';
  const envParam = url.searchParams.get('env') || 'prod';

  if (!objectKey) {
    return new Response('Not Found', { status: 404 });
  }

  if (!exp || !token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Expiration check
  const nowSec = Math.floor(Date.now() / 1000);
  if (exp <= nowSec) {
    return new Response('Link expired', { status: 401 });
  }

  // Verify HMAC token
  const payload = `${objectKey}|${exp}`;
  const expected = await hmacSha256Hex(env.CDN_SIGNING_SECRET, payload);
  if (expected !== token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Choose bucket based on env param
  const bucket = envParam === 'dev' ? env.R2_MEDIA_DEV : env.R2_MEDIA_PROD;

  // Support Range requests
  const rangeHeader = request.headers.get('range') || undefined;
  const range = rangeHeader ? { range: rangeHeader } : undefined;

  const object = await bucket.get(objectKey, range ? { range } : undefined);
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  // Build response with headers
  const headers = new Headers();
  // Copy object headers
  object.writeHttpMetadata(headers);
  headers.set('Content-Length', object.size.toString());
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
  headers.set('Access-Control-Allow-Origin', '*');

  // Range support (Worker R2 automatically sets Content-Range when range used)
  return new Response(object.body, {
    status: range ? 206 : 200,
    headers,
  });
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
};
