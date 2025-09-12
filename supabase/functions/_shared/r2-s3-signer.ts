// Minimal AWS SigV4 signer for Cloudflare R2 (S3-compatible)
// Works in Deno/Supabase Edge using WebCrypto

interface SignerConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string; // R2 ignores region but we keep 'auto' for canonical scope
  service?: string; // s3
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  return ab;
}

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const hash = await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes));
  return toHex(hash);
}

async function hmacSha256(
  key: ArrayBuffer | Uint8Array,
  data: string
): Promise<ArrayBuffer> {
  const keyBytes = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const dataBytes = new TextEncoder().encode(data);
  return crypto.subtle.sign('HMAC', cryptoKey, toArrayBuffer(dataBytes));
}

async function getSigningKey(
  secretKey: string,
  date: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(
    new TextEncoder().encode(`AWS4${secretKey}`),
    date
  );
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

export interface PresignOptions {
  method: 'GET' | 'PUT' | 'HEAD';
  url: string; // full URL including host and path, without query
  headers?: Record<string, string>;
  expiresInSeconds: number; // max 7 days for S3; keep small (e.g., 1 day)
}

export async function presignUrl(
  config: SignerConfig,
  options: PresignOptions
): Promise<string> {
  const service = config.service ?? 's3';
  const region = config.region ?? 'auto'; // R2 uses 'auto'

  const urlObj = new URL(options.url);
  const method = options.method.toUpperCase();

  const now = new Date();
  const amzDate = `${now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, '')
    .slice(0, 15)}Z`; // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8); // YYYYMMDD

  // Required query params for presigning
  const credential = `${config.accessKeyId}/${dateStamp}/${region}/${service}/aws4_request`;
  const query = urlObj.searchParams;
  query.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  query.set('X-Amz-Credential', credential);
  query.set('X-Amz-Date', amzDate);
  query.set('X-Amz-Expires', String(options.expiresInSeconds));
  query.set('X-Amz-SignedHeaders', 'host');

  // Canonical request
  const canonicalUri = urlObj.pathname;
  const canonicalQuery = new URLSearchParams(
    Array.from(query.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  ).toString();
  const canonicalHeaders = `host:${urlObj.host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    canonicalRequestHash,
  ].join('\n');

  const signingKey = await getSigningKey(
    config.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = toHex(await hmacSha256(signingKey, stringToSign));
  query.set('X-Amz-Signature', signature);

  // Return presigned URL
  return `${urlObj.origin}${urlObj.pathname}?${query.toString()}`;
}
