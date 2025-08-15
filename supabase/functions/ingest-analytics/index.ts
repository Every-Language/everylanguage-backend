// Ingest Analytics Edge Function
// - Authenticates user
// - Extracts client IP
// - Performs pluggable IP geolocation (managed API)
// - Enriches analytics writes with coarse GeoJSON location when device location is absent
// - Upserts idempotently by `id`

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

type CrudOp = {
  id: string;
  table: string;
  op: string | number; // UpdateType from client (PUT/PATCH/DELETE) or numeric enum
  opData: Record<string, unknown>;
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
  region?: string;
  city?: string;
  accuracy_km?: number; // Coarse estimate
};

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
      const data: any = await res.json();
      // ipinfo "loc" format: "lat,lon"
      if (!data?.loc || typeof data.loc !== 'string') return null;
      const [latStr, lonStr] = data.loc.split(',');
      const lat = Number(latStr);
      const lon = Number(lonStr);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        country_iso: data?.country ?? undefined,
        region: data?.region ?? undefined,
        city: data?.city ?? undefined,
        // Heuristic: city-level accuracy is typically 10–50km; choose conservative 25km
        accuracy_km: 25,
      };
    }

    if (provider === 'ipapi') {
      // Example alternative provider: https://ipapi.co/{ip}/json
      const url = `https://ipapi.co/${encodeURIComponent(ip)}/json/`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return null;
      const data: any = await res.json();
      const lat = Number(data?.latitude);
      const lon = Number(data?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        country_iso: data?.country?.toUpperCase?.() ?? undefined,
        region: data?.region ?? undefined,
        city: data?.city ?? undefined,
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
      const data: any = await res.json();
      const lat = Number(data?.latitude);
      const lon = Number(data?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return {
        lat,
        lon,
        country_iso: data?.country_code?.toUpperCase?.() ?? undefined,
        region: data?.region ?? undefined,
        city: data?.city ?? undefined,
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

// Normalize op name (supports enum numeric values if client sends UpdateType)
function normalizeOp(
  op: string | number
): 'PUT' | 'PATCH' | 'DELETE' | 'UNKNOWN' {
  if (typeof op === 'string') {
    const upper = op.toUpperCase();
    if (upper === 'PUT' || upper === 'PATCH' || upper === 'DELETE')
      return upper as any;
    return 'UNKNOWN';
  }
  // Fallback mapping for numeric enums if needed: UpdateType.PUT=0, PATCH=1, DELETE=2 (example)
  if (op === 0) return 'PUT';
  if (op === 1) return 'PATCH';
  if (op === 2) return 'DELETE';
  return 'UNKNOWN';
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Authenticate caller and get supabase client bound to their JWT
    const authCtx = await authenticateRequest(req);
    if (isAuthError(authCtx)) {
      return createAuthErrorResponse(authCtx);
    }

    const { supabaseClient, publicUserId } = authCtx;

    // Parse body
    let body: IngestRequest;
    try {
      body = (await req.json()) as IngestRequest;
    } catch (e) {
      return createErrorResponse(
        'Invalid JSON body',
        400,
        e instanceof Error ? e.message : undefined
      );
    }

    if (!Array.isArray(body.ops) || body.ops.length === 0) {
      return createErrorResponse('No operations provided', 400);
    }

    // Extract client IP once per batch
    const clientIp = extractClientIp(req);
    let cachedGeo: GeoResult | null = null;

    // Process ops sequentially to keep things simple and deterministic for idempotency
    const results: Array<{
      id: string;
      table: string;
      status: 'ok' | 'skipped' | 'error';
      error?: string;
    }> = [];

    for (const op of body.ops) {
      const norm = normalizeOp(op.op);
      const table = op.table;

      // Only allow known analytics tables through this endpoint
      if (!ANALYTICS_TABLES.has(table)) {
        results.push({ id: op.id, table, status: 'skipped' });
        continue;
      }

      if (norm === 'DELETE') {
        // By convention, analytics writes are append-only. Skip deletes gracefully.
        results.push({ id: op.id, table, status: 'skipped' });
        continue;
      }

      try {
        const record: Record<string, unknown> = { ...op.opData, id: op.id };

        // If location missing and we have an IP, try to geolocate
        const hasLocation = record.location != null;
        if (!hasLocation && clientIp) {
          cachedGeo ??= await geolocateIp(clientIp);
          if (cachedGeo) {
            record.location = toGeoJsonPoint(cachedGeo.lon, cachedGeo.lat);
          }
        } else if (typeof record.location === 'string') {
          // If client sent location as JSON string, parse to object
          const str = record.location;
          if (str.startsWith('{')) {
            try {
              record.location = JSON.parse(str);
            } catch {
              // leave as-is on parse failure
            }
          }
        }

        // Attach ownership metadata if applicable in future (keeping for parity)
        // Example: record.created_by = publicUserId; // Only if such a column exists

        // Idempotent upsert by id
        const { error } = await supabaseClient.from(table).upsert(record, {
          onConflict: 'id',
        });
        if (error) {
          results.push({
            id: op.id,
            table,
            status: 'error',
            error: error.message,
          });
          continue;
        }

        results.push({ id: op.id, table, status: 'ok' });
      } catch (e: unknown) {
        results.push({
          id: op.id,
          table,
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }

    return createSuccessResponse({ results, publicUserId });
  } catch (error) {
    return handleUnexpectedError(error);
  }
});
