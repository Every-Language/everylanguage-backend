import {
  createCorsResponse,
  createErrorResponse,
  createSuccessResponse,
  createParsingErrorResponse,
  createValidationErrorResponse,
  handleUnexpectedError,
} from '../_shared/response-utils.ts';
import {
  authenticateRequest,
  createAuthErrorResponse,
  isAuthError,
} from '../_shared/auth-middleware.ts';

interface CloseSessionBody {
  session_id: string;
  ended_at: string; // ISO timestamp
  started_at?: string; // ISO timestamp (optional for upsert fallback)
}

function isIsoDateString(value: string): boolean {
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
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
    let body: CloseSessionBody;
    try {
      body = (await req.json()) as CloseSessionBody;
    } catch (e) {
      return createParsingErrorResponse(
        e instanceof Error ? e.message : 'Invalid JSON'
      );
    }

    // Validate input
    if (typeof body.session_id !== 'string' || body.session_id.length === 0) {
      return createValidationErrorResponse(
        '`session_id` is required and must be a non-empty string.'
      );
    }
    if (typeof body.ended_at !== 'string' || !isIsoDateString(body.ended_at)) {
      return createValidationErrorResponse(
        '`ended_at` must be a valid ISO timestamp string.'
      );
    }
    if (typeof body.started_at !== 'undefined') {
      if (
        typeof body.started_at !== 'string' ||
        !isIsoDateString(body.started_at)
      ) {
        return createValidationErrorResponse(
          '`started_at` must be a valid ISO timestamp string when provided.'
        );
      }
    }

    const sessionId = body.session_id;
    const endedAt = new Date(body.ended_at).toISOString();
    const startedAt = body.started_at
      ? new Date(body.started_at).toISOString()
      : undefined;

    // Fetch existing session to determine existence and current ended_at
    const { data: existing, error: fetchError } = await supabaseClient
      .from('sessions')
      .select('id, ended_at')
      .eq('id', sessionId)
      .eq('user_id', publicUserId)
      .maybeSingle();

    if (fetchError) {
      // Database error reading the session
      return createErrorResponse('Database error', 500, fetchError.message);
    }

    if (existing) {
      // If existing.ended_at is null or earlier than new endedAt, update; else no-op
      const shouldUpdate =
        !existing.ended_at ||
        new Date(existing.ended_at).getTime() < new Date(endedAt).getTime();
      if (shouldUpdate) {
        const { error: updateError } = await supabaseClient
          .from('sessions')
          .update({ ended_at: endedAt })
          .eq('id', sessionId)
          .eq('user_id', publicUserId);

        if (updateError) {
          return createErrorResponse(
            'Database error',
            500,
            updateError.message
          );
        }
      }

      return createSuccessResponse({ status: 'ok' });
    }

    // If not found: Option A (preferred) — upsert if we have started_at
    if (!existing && startedAt) {
      // Ensure ended_at >= started_at
      const endTs = new Date(endedAt).getTime();
      const startTs = new Date(startedAt).getTime();
      const finalEndedAt = new Date(Math.max(endTs, startTs)).toISOString();

      const { error: upsertError } = await supabaseClient
        .from('sessions')
        .upsert(
          {
            id: sessionId,
            user_id: publicUserId,
            started_at: startedAt,
            ended_at: finalEndedAt,
          },
          { onConflict: 'id' }
        );

      if (upsertError) {
        // Likely due to NOT NULL constraints on other columns; advise client to retry later via its normal flow
        return createErrorResponse(
          'Session not found for this user. Retry later after session creation completes.',
          404
        );
      }

      return createSuccessResponse({ status: 'ok' });
    }

    // If not found and no started_at to upsert with, respond with soft failure so client can retry later
    return createErrorResponse(
      'Session not found for this user. Retry later or include `started_at` to allow upsert.',
      404
    );
  } catch (error: unknown) {
    return handleUnexpectedError(error);
  }
});
