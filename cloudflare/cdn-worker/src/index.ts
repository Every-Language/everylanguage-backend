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
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
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

    // Handle Range requests
    const rangeHeader = request.headers.get('range');
    const isHeadRequest = request.method === 'HEAD';
    let object;

    if (rangeHeader && !isHeadRequest) {
      // For range requests, use R2's range support
      const rangeHeaders = new Headers();
      rangeHeaders.set('Range', rangeHeader);
      object = await bucket.get(objectKey, { range: rangeHeaders });
    } else {
      // Normal request or HEAD request
      object = await bucket.get(objectKey);
    }

    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    // Build response headers
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range');

    // Ensure Content-Length is set for HEAD requests and full GET requests
    if (isHeadRequest || !rangeHeader) {
      headers.set('Content-Length', object.size.toString());
    }

    // Return appropriate status code
    const status = rangeHeader && !isHeadRequest ? 206 : 200;

    // HEAD requests should not include body
    const responseBody = isHeadRequest ? null : object.body;

    return new Response(responseBody, {
      status,
      headers,
    });
  } catch (error) {
    console.error('Worker error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return new Response(`Internal Server Error: ${errorMessage}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }
}

export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
};
