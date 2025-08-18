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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[ab89][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
    if (!isUuid(body.session_id)) {
      return createValidationErrorResponse(
        '`session_id` must be a valid UUID.'
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
    const endedAtInputIso = new Date(body.ended_at).toISOString();
    const startedAtIso = body.started_at
      ? new Date(body.started_at).toISOString()
      : undefined;

    // Clamp to server-now to avoid future-ended values
    const clampedEndedAtIso = new Date(
      Math.min(Date.parse(endedAtInputIso), Date.now())
    ).toISOString();

    // Single-statement conditional update to avoid read→write race
    // Update only when (ended_at is null OR ended_at < clampedEndedAt)
    // AND (started_at is null OR started_at <= clampedEndedAt)
    const endedAtEnc = encodeURIComponent(clampedEndedAtIso);
    const startedOkExpr = `or(started_at.is.null,started_at.lte.${endedAtEnc})`;
    const orExpr = `and(ended_at.is.null,${startedOkExpr}),and(ended_at.lt.${endedAtEnc},${startedOkExpr})`;

    const { data: updatedRows, error: conditionalUpdateError } =
      await supabaseClient
        .from('sessions')
        .update({ ended_at: clampedEndedAtIso })
        .eq('id', sessionId)
        .eq('user_id', publicUserId)
        .or(orExpr)
        .select('id');

    if (conditionalUpdateError) {
      return createErrorResponse(
        'Database error',
        500,
        conditionalUpdateError.message
      );
    }

    if (Array.isArray(updatedRows) && updatedRows.length > 0) {
      return createSuccessResponse({ status: 'ok', updated: true });
    }

    // No row changed. Determine if the session exists to decide upsert vs idempotent ok
    const { data: existing, error: fetchError } = await supabaseClient
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', publicUserId)
      .maybeSingle();

    if (fetchError) {
      return createErrorResponse('Database error', 500, fetchError.message);
    }

    if (existing) {
      // Exists but not updated: either ended_at already >= provided, or started_at guard prevented change
      return createSuccessResponse({ status: 'ok', updated: false });
    }

    // If not found: Option A (preferred) — upsert if we have started_at
    if (startedAtIso) {
      // Ensure ended_at >= started_at & not future
      const finalEndedAtIso = new Date(
        Math.max(Date.parse(clampedEndedAtIso), Date.parse(startedAtIso))
      ).toISOString();

      const { error: upsertError } = await supabaseClient
        .from('sessions')
        .upsert(
          {
            id: sessionId,
            user_id: publicUserId,
            started_at: startedAtIso,
            ended_at: finalEndedAtIso,
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

      return createSuccessResponse({ status: 'ok', updated: true });
    }

    // Not found and no started_at provided
    return createErrorResponse(
      'Session not found for this user. Retry later or include `started_at` to allow upsert.',
      404
    );
  } catch (error: unknown) {
    return handleUnexpectedError(error);
  }
});
