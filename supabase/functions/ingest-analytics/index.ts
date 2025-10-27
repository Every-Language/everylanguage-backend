// Ingest Analytics Edge Function
// - Authenticates user
// - Extracts client IP
// - Performs pluggable IP geolocation (managed API)
// - Enriches analytics writes with coarse GeoJSON location when device location is absent
// - Upserts idempotently by `id`
// - Implements PowerSync-compatible error classification and structured responses
// - Includes request size/rate limiting and structured logging

// Note: Supabase client is created in auth middleware; not needed here
import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';
import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
  handleUnexpectedError,
} from '../_shared/response-utils.ts';

// Allowed analytics tables for ingestion
const ANALYTICS_TABLES = new Set<string>(['sessions', 'app_downloads']);

// Request limits for production safety
const MAX_OPS_PER_REQUEST = 1000;
const MAX_REQUEST_SIZE_MB = 10;
const RATE_LIMIT_PER_MINUTE = 600; // operations per minute per user

// Simple in-memory rate limiting (production should use Redis/external store)
const rateLimitStore = new Map<
  string,
  { count: number; windowStart: number }
>();

type CrudOp = {
  id: string;
  table: string;
  op: string | number; // UpdateType from client (PUT/PATCH/DELETE) or numeric enum
  opData: Record<string, unknown>;
};

// Structured response types for PowerSync compatibility
type OperationResult = {
  id: string;
  table: string;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
  retryable?: boolean; // Indicates if error is retryable
};

type IngestResponse = {
  results: OperationResult[];
  publicUserId: string;
  requestId: string;
  totalOps: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
};

// Type for geolocation API responses
type GeolocationApiResponse = {
  // ipinfo fields
  loc?: string;
  country?: string;
  region?: string;
  city?: string;
  // ipapi/ipdata fields
  latitude?: number;
  longitude?: number;
  country_code?: string;
  country_name?: string;
  region_code?: string;
  continent_code?: string;
  continent_name?: string;
};

type IngestRequest = {
  ops: CrudOp[];
  // Optional device metadata sent by client
  device?: {
    id?: string;
    platform?: string;
    app_version?: string;
    os?: string;
    os_version?: string;
  };
};

type GeoResult = {
  lat: number;
  lon: number;
  country_iso?: string;
  country_code?: string;
  continent_code?: string;
  region?: string;
  region_code?: string;
  city?: string;
  accuracy_km?: number; // Coarse estimate
};

// Required fields validation schemas
const REQUIRED_FIELDS = {
  sessions: ['user_id', 'platform', 'app_version'],
  app_downloads: ['user_id', 'device_id', 'platform', 'app_version'],
} as const;

// PowerSync-compatible error classification patterns
const RETRYABLE_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /connection/i,
  /temporary/i,
  /rate.?limit/i,
  /server.?error/i,
  /unavailable/i,
  /500|502|503|504/, // HTTP error codes
  /ECONNRESET|ENOTFOUND|ETIMEDOUT/i, // Common network errors
];

const NON_RETRYABLE_ERROR_PATTERNS = [
  /row.?level.?security/i,
  /rls.?policy/i,
  /permission.?denied/i,
  /violates.?check.?constraint/i,
  /violates.?foreign.?key/i,
  /violates.?unique.?constraint/i,
  /invalid.?input/i,
  /column.*does.?not.?exist/i,
  /relation.*does.?not.?exist/i,
  /duplicate.?key/i,
  /400|401|403|409|422/, // HTTP error codes
  /missing.?required.?field/i,
];

// Generate unique request ID for structured logging
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Structure logging helper
function structuredLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  data: Record<string, unknown> = {}
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console[level === 'info' ? 'log' : level](JSON.stringify(logEntry));
}

// Extract the best-effort client IP from headers
function extractClientIp(req: Request): string | null {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp;

  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  const xr = req.headers.get('x-real-ip');
  if (xr) return xr;

  // Deno ConnInfo isn't directly available here; fall back to null
  return null;
}

// Rate limiting check
function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const key = `rate_${userId}`;

  const current = rateLimitStore.get(key);

  if (!current || now - current.windowStart > windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - 1 };
  }

  if (current.count >= RATE_LIMIT_PER_MINUTE) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: RATE_LIMIT_PER_MINUTE - current.count };
}

// Validate request size
function validateRequestSize(bodyText: string): {
  valid: boolean;
  sizeMB: number;
} {
  const sizeBytes = new TextEncoder().encode(bodyText).length;
  const sizeMB = sizeBytes / (1024 * 1024);
  return { valid: sizeMB <= MAX_REQUEST_SIZE_MB, sizeMB };
}

// Pre-validate required fields for a table
function validateRequiredFields(
  table: string,
  opData: Record<string, unknown>
): { valid: boolean; missingFields: string[] } {
  const requiredFields = REQUIRED_FIELDS[table as keyof typeof REQUIRED_FIELDS];

  const missingFields = requiredFields.filter(
    field =>
      opData[field] === undefined ||
      opData[field] === null ||
      opData[field] === ''
  );

  return { valid: missingFields.length === 0, missingFields };
}

// Classify error as retryable or non-retryable (PowerSync compatible)
function classifyError(error: string): {
  retryable: boolean;
  classification: string;
} {
  const errorLower = error.toLowerCase();

  // Check non-retryable patterns first (more specific)
  for (const pattern of NON_RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(errorLower)) {
      return {
        retryable: false,
        classification: 'validation_or_permission_error',
      };
    }
  }

  // Check retryable patterns
  for (const pattern of RETRYABLE_ERROR_PATTERNS) {
    if (pattern.test(errorLower)) {
      return {
        retryable: true,
        classification: 'network_or_server_error',
      };
    }
  }

  // Default to retryable for unknown errors (safer for PowerSync)
  return { retryable: true, classification: 'unknown_error' };
}

// Simple, pluggable IP geolocation via managed APIs
// Supports ipinfo.io style out of the box; can be extended via env
async function geolocateIp(ip: string): Promise<GeoResult | null> {
  try {
    // Provider selection via env
    const provider = Deno.env.get('IP_GEO_PROVIDER')?.toLowerCase() ?? 'ipinfo';

    if (provider === 'ipinfo') {
      const token = Deno.env.get('IP_GEO_API_KEY') ?? '';
      const url = `https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return null;
      const data: GeolocationApiResponse = await res.json();
      // ipinfo "loc" format: "lat,lon"
      if (!data.loc || typeof data.loc !== 'string') return null;
      const [latStr, lonStr] = data.loc.split(',');
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        country_iso: data.country ?? undefined,
        country_code: data.country ?? undefined, // ipinfo uses 2-letter codes
        region: data.region ?? undefined,
        city: data.city ?? undefined,
        // Heuristic: city-level accuracy is typically 10–50km; choose conservative 25km
        accuracy_km: 25,
      };
    }

    if (provider === 'ipapi') {
      // Example alternative provider: https://ipapi.co/{ip}/json
      const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return null;
      const data: GeolocationApiResponse = await res.json();
      const lat = Number(data.latitude);
      const lon = Number(data.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        country_iso: data.country_code?.toUpperCase() ?? undefined,
        country_code: data.country_code?.toUpperCase() ?? undefined,
        continent_code: data.continent_code?.toUpperCase() ?? undefined,
        region: data.region ?? undefined,
        region_code: data.region_code ?? undefined,
        city: data.city ?? undefined,
        accuracy_km: 25,
      };
    }

    if (provider === 'ipdata') {
      // https://ipdata.co API: https://api.ipdata.co/{ip}?api-key=KEY
      const token = Deno.env.get('IP_GEO_API_KEY') ?? '';
      if (!token) return null;
      const url = `https://api.ipdata.co/${encodeURIComponent(ip)}?api-key=${encodeURIComponent(token)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return null;
      const data: GeolocationApiResponse = await res.json();
      const lat = Number(data.latitude);
      const lon = Number(data.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        country_iso: data.country_code?.toUpperCase() ?? undefined,
        country_code: data.country_code?.toUpperCase() ?? undefined,
        continent_code: data.continent_code?.toUpperCase() ?? undefined,
        region: data.region ?? undefined,
        region_code: data.region_code ?? undefined,
        city: data.city ?? undefined,
        accuracy_km: 25,
      };
    }

    // Unknown provider
    return null;
  } catch {
    return null;
  }
}

// Build GeoJSON Point suitable for PostgREST -> PostGIS geometry
function toGeoJsonPoint(lon: number, lat: number) {
  return {
    type: 'Point',
    coordinates: [lon, lat],
  } as const;
}

// Minimal client types to avoid `any` while supporting our usage
type PostgrestErrorLike = { message: string } | null;
type PostgrestResponseLike<T> = { data: T[] | null; error: PostgrestErrorLike };
type PostgrestFilterLike<T> = {
  select: (columns: string) => PostgrestFilterLike<T>;
  eq: (column: string, value: string) => PostgrestFilterLike<T>;
  order: (
    column: string,
    options: { ascending: boolean; nullsFirst?: boolean; foreignTable?: string }
  ) => PostgrestFilterLike<T>;
  limit: (n: number) => Promise<PostgrestResponseLike<T>>;
};
type SupabaseClientLike = {
  from: <T = unknown>(table: string) => PostgrestFilterLike<T>;
  rpc: <T = unknown>(
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: T | null; error: PostgrestErrorLike }>;
};

// Fetch latest app_downloads.id for a user (ordered by downloaded_at desc, fallback to id desc)
async function fetchLatestAppDownloadId(
  supabaseClient: SupabaseClientLike,
  userId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient
      .from<{ id: string; downloaded_at: string | null }>('app_downloads')
      .select('id, downloaded_at')
      .eq('user_id', userId)
      .order('downloaded_at', { ascending: false, nullsFirst: false })
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0 && data[0]?.id) {
      return data[0].id;
    }

    // Fallback if downloaded_at is null for all rows
    const { data: data2, error: error2 } = await supabaseClient
      .from<{ id: string }>('app_downloads')
      .select('id')
      .eq('user_id', userId)
      .order('id', { ascending: false })
      .limit(1);

    if (!error2 && Array.isArray(data2) && data2.length > 0 && data2[0]?.id) {
      return data2[0].id;
    }

    return null;
  } catch {
    return null;
  }
}

// Normalize op name (supports enum numeric values if client sends UpdateType)
function normalizeOp(
  op: string | number
): 'PUT' | 'PATCH' | 'DELETE' | 'UNKNOWN' {
  if (typeof op === 'string') {
    const upper = op.toUpperCase();
    if (upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE')
      return upper;
    return 'UNKNOWN';
  }
  // Fallback mapping for numeric enums if needed: UpdateType.PUT=0, PATCH=1, DELETE=2 (example)
  if (op === 0) return 'PUT';
  if (op === 1) return 'PATCH';
  if (op === 2) return 'DELETE';
  return 'UNKNOWN';
}

Deno.serve(async (req: Request): Promise<Response> => {
  const requestId = generateRequestId();

  structuredLog('info', 'Request started', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers.get('user-agent'),
  });

  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    structuredLog('warn', 'Method not allowed', {
      requestId,
      method: req.method,
    });
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate caller and get supabase client bound to their JWT
    const authCtx = await authenticateRequest(req);
    if (isAuthError(authCtx)) {
      structuredLog('warn', 'Authentication failed', {
        requestId,
        error: 'Authentication failed',
      });
      return createAuthErrorResponse(authCtx);
    }

    const { supabaseClient, publicUserId } = authCtx;

    structuredLog('info', 'User authenticated', {
      requestId,
      userId: publicUserId,
    });

    // Parse body with size validation
    const bodyText = await req.text();
    const sizeCheck = validateRequestSize(bodyText);

    if (!sizeCheck.valid) {
      structuredLog('warn', 'Request too large', {
        requestId,
        userId: publicUserId,
        sizeMB: sizeCheck.sizeMB,
        maxSizeMB: MAX_REQUEST_SIZE_MB,
      });
      return createErrorResponse(
        `Request too large: ${sizeCheck.sizeMB.toFixed(2)}MB (max: ${MAX_REQUEST_SIZE_MB}MB)`,
        413
      );
    }

    let body: IngestRequest;
    try {
      body = JSON.parse(bodyText) as IngestRequest;
    } catch (e) {
      structuredLog('warn', 'Invalid JSON body', {
        requestId,
        userId: publicUserId,
        error: e instanceof Error ? e.message : 'Unknown parse error',
      });
      return createErrorResponse(
        'Invalid JSON body',
        400,
        e instanceof Error ? e.message : undefined
      );
    }

    if (!Array.isArray(body.ops) || body.ops.length === 0) {
      structuredLog('warn', 'No operations provided', {
        requestId,
        userId: publicUserId,
      });
      return createErrorResponse('No operations provided', 400);
    }

    if (body.ops.length > MAX_OPS_PER_REQUEST) {
      structuredLog('warn', 'Too many operations', {
        requestId,
        userId: publicUserId,
        opsCount: body.ops.length,
        maxOps: MAX_OPS_PER_REQUEST,
      });
      return createErrorResponse(
        `Too many operations: ${body.ops.length} (max: ${MAX_OPS_PER_REQUEST})`,
        400
      );
    }

    // Rate limiting check
    const rateCheck = checkRateLimit(publicUserId);
    if (!rateCheck.allowed) {
      structuredLog('warn', 'Rate limit exceeded', {
        requestId,
        userId: publicUserId,
        opsCount: body.ops.length,
      });
      return createErrorResponse(
        'Rate limit exceeded. Please try again later.',
        429
      );
    }

    structuredLog('info', 'Processing analytics batch', {
      requestId,
      userId: publicUserId,
      opsCount: body.ops.length,
      rateLimitRemaining: rateCheck.remaining,
    });

    // Extract client IP once per batch
    const clientIp = extractClientIp(req);
    let cachedGeo: GeoResult | null = null;
    let cachedLatestAppDownloadId: string | null | undefined = undefined;

    // Process ops sequentially to keep things simple and deterministic for idempotency
    const results: OperationResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const [index, op] of body.ops.entries()) {
      const norm = normalizeOp(op.op);
      const table = op.table;

      const opLog = {
        requestId,
        userId: publicUserId,
        opIndex: index,
        opId: op.id,
        table,
        operation: norm,
      };

      // Only allow known analytics tables through this endpoint
      if (!ANALYTICS_TABLES.has(table)) {
        structuredLog('info', 'Skipped: Unknown table', opLog);
        results.push({
          id: op.id,
          table,
          status: 'skipped',
          error: `Table '${table}' not supported by analytics endpoint`,
          retryable: false,
        });
        skippedCount++;
        continue;
      }

      if (norm === 'DELETE') {
        // By convention, analytics writes are append-only. Skip deletes gracefully.
        structuredLog('info', 'Skipped: Delete operation not allowed', opLog);
        results.push({
          id: op.id,
          table,
          status: 'skipped',
          error: 'DELETE operations not allowed for analytics tables',
          retryable: false,
        });
        skippedCount++;
        continue;
      }

      // Pre-validate required fields
      const validation = validateRequiredFields(table, op.opData);
      if (!validation.valid) {
        structuredLog('warn', 'Validation failed: Missing required fields', {
          ...opLog,
          missingFields: validation.missingFields,
        });
        results.push({
          id: op.id,
          table,
          status: 'error',
          error: `Missing required fields: ${validation.missingFields.join(', ')}`,
          retryable: false,
        });
        errorCount++;
        continue;
      }

      try {
        const record: Record<string, unknown> = { ...op.opData, id: op.id };

        // Ensure user_id is set to the authenticated user (critical for RLS)
        record.user_id = publicUserId;

        // If sessions.app_download_id is missing, backfill with latest app_download for this user
        if (table === 'sessions') {
          const hasAppDownloadId =
            typeof record.app_download_id === 'string'
              ? record.app_download_id.trim() !== ''
              : record.app_download_id != null;
          if (!hasAppDownloadId) {
            cachedLatestAppDownloadId ??= await fetchLatestAppDownloadId(
              supabaseClient,
              publicUserId
            );
            if (cachedLatestAppDownloadId) {
              record.app_download_id = cachedLatestAppDownloadId;
              structuredLog('info', 'App download ID backfilled for session', {
                ...opLog,
                appDownloadId: cachedLatestAppDownloadId,
              });
            } else {
              structuredLog(
                'info',
                'No app_download found to backfill for session',
                {
                  ...opLog,
                }
              );
            }
          }
        }

        // If location missing and we have an IP, try to geolocate
        const hasLocation = record.location != null;
        if (!hasLocation && clientIp) {
          cachedGeo ??= await geolocateIp(clientIp);
          if (cachedGeo) {
            record.location = toGeoJsonPoint(cachedGeo.lon, cachedGeo.lat);
            // For sessions table, also set location metadata
            if (table === 'sessions') {
              record.location_source = 'ip';
              // country/continent/region codes will be normalized from point below

              structuredLog('info', 'IP geolocation enrichment applied', {
                ...opLog,
                clientIp,
                city: cachedGeo.city,
              });
            }
          }
        } else if (typeof record.location === 'string') {
          // If client sent location as JSON string, parse to object
          const str = record.location;
          if (str.startsWith('{')) {
            try {
              record.location = JSON.parse(str);
              // For sessions table, mark as device location
              if (table === 'sessions' && !record.location_source) {
                record.location_source = 'device';
              }
            } catch (parseError) {
              structuredLog('warn', 'Failed to parse location JSON', {
                ...opLog,
                locationString: str,
                parseError:
                  parseError instanceof Error ? parseError.message : 'Unknown',
              });
              // leave as-is on parse failure
            }
          }
        }

        // Normalize country_code from point for sessions and app_downloads
        try {
          const loc = record.location as
            | { type: string; coordinates: [number, number] }
            | undefined;
          if (loc && loc.type === 'Point' && Array.isArray(loc.coordinates)) {
            const [lon, lat] = loc.coordinates;
            const { data: ccData, error: ccErr } = await supabaseClient.rpc(
              'get_country_code_from_point',
              {
                lon,
                lat,
              }
            );
            if (!ccErr && ccData) {
              // Apply to sessions and app_downloads
              if (table === 'sessions' || table === 'app_downloads') {
                record.country_code = ccData;
              }
            }
          }
        } catch (geoErr) {
          structuredLog('warn', 'Failed to classify country from point', {
            ...opLog,
            error:
              geoErr instanceof Error ? geoErr.message : 'Unknown geo error',
          });
        }

        // Idempotent upsert by id
        const { error } = await supabaseClient.from(table).upsert(record, {
          onConflict: 'id',
        });

        if (error) {
          const errorClassification = classifyError(error.message);

          structuredLog('error', 'Database operation failed', {
            ...opLog,
            error: error.message,
            retryable: errorClassification.retryable,
            classification: errorClassification.classification,
          });

          results.push({
            id: op.id,
            table,
            status: 'error',
            error: error.message,
            retryable: errorClassification.retryable,
          });
          errorCount++;
          continue;
        }

        structuredLog('info', 'Operation successful', opLog);
        results.push({
          id: op.id,
          table,
          status: 'ok',
          retryable: false, // Success doesn't need retry info
        });
        successCount++;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        const errorClassification = classifyError(errorMessage);

        structuredLog('error', 'Unexpected error during operation', {
          ...opLog,
          error: errorMessage,
          retryable: errorClassification.retryable,
          classification: errorClassification.classification,
        });

        results.push({
          id: op.id,
          table,
          status: 'error',
          error: errorMessage,
          retryable: errorClassification.retryable,
        });
        errorCount++;
      }
    }

    const response: IngestResponse = {
      results,
      publicUserId,
      requestId,
      totalOps: body.ops.length,
      successCount,
      errorCount,
      skippedCount,
    };

    structuredLog('info', 'Batch processing completed', {
      requestId,
      userId: publicUserId,
      totalOps: body.ops.length,
      successCount,
      errorCount,
      skippedCount,
      processingTimeMs: Date.now() - parseInt(requestId.split('_')[1]),
    });

    return createSuccessResponse(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    structuredLog('error', 'Unexpected error in request handler', {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return handleUnexpectedError(error);
  }
});
