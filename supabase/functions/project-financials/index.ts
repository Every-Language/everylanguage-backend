import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {
  createSuccessResponse,
  createErrorResponse,
  createCorsResponse,
} from '../_shared/response-utils.ts';
import {
  authenticateRequest,
  isAuthError,
  createAuthErrorResponse,
} from '../_shared/auth-middleware.ts';

/**
 * Authenticated endpoint returning financial summaries for a project via the
 * project_financials materialized view. Authorization is enforced by selecting
 * the row through RLS-enabled underlying tables (security invoker view) and/or
 * explicit checks by reading the project itself.
 *
 * Query params: project_id (uuid required)
 */
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  const auth = await authenticateRequest(req);
  if (isAuthError(auth)) {
    return createAuthErrorResponse(auth);
  }

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');
    if (!projectId) {
      return createErrorResponse('project_id is required', 400);
    }

    // Use anon key + user auth header to leverage RLS
    const supabase = auth.supabaseClient;

    // Optional pre-check: ensure user can read project (fast fail)
    const { data: proj, error: projErr } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();
    if (projErr || !proj) {
      return createErrorResponse('Not authorized or project not found', 403);
    }

    const { data, error } = await supabase
      .from('project_financials')
      .select('*')
      .eq('project_id', projectId)
      .single();
    if (error) {
      return createErrorResponse(
        `DB error (project_financials): ${error.message}`,
        500
      );
    }

    return createSuccessResponse({ financials: data });
  } catch (error) {
    return createErrorResponse((error as Error).message, 500);
  }
});
