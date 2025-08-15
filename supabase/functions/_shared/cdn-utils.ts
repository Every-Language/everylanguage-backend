// Utilities to generate signed CDN URLs for Cloudflare Worker

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createSignedCdnUrl(
  baseUrl: string,
  objectKey: string,
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + Math.max(1, expiresInSeconds);
  const payload = `${objectKey}|${exp}`;
  const token = await hmacSha256Hex(secret, payload);
  const url = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.pathname = `${url.pathname}${objectKey}`.replace(/\/+/, '/');
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('token', token);
  return url.toString();
}
