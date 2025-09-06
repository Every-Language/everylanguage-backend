import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
// This Edge Function drains the progress_refresh_queue and refreshes MVs
// by calling the RPC drain function. It is idempotent and safe to run
// on a schedule (cron) or ad-hoc.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

interface RpcResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

async function callRpc<T>(
  fn: string,
  params?: Record<string, unknown>
): Promise<RpcResponse<T>> {
  const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(params ?? {}),
  });
  if (!res.ok) {
    let message = `RPC ${fn} failed with status ${res.status}`;
    try {
      const text = await res.text();
      if (text) message += `: ${text}`;
    } catch {
      /* ignore parsing error for error body */
    }
    return { data: null, error: { message } };
  }
  const data = (await res.json()) as T;
  return { data, error: null };
}

Deno.serve(async (_req: Request) => {
  // Drain the queue; if any rows existed, the RPC refreshes MVs concurrently
  const { data, error } = await callRpc<
    Array<{ kind: string; version_id: string }>
  >('drain_progress_refresh_queue');
  if (error) {
    return new Response(JSON.stringify({ ok: false, error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ ok: true, drained: data ?? [] }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
