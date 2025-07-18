import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from './request-parser.ts';
import { getPublicUserId } from './user-service.ts';

export interface AuthenticatedContext {
  supabaseClient: any;
  user: any;
  publicUserId: string;
}

export interface AuthError {
  status: number;
  error: string;
  details?: string;
}

/**
 * Authentication middleware for Edge Functions
 * Handles CORS, user authentication, and public user ID retrieval
 */
export async function authenticateRequest(
  req: Request
): Promise<AuthenticatedContext | AuthError> {
  try {
    // Initialize Supabase client with auth headers
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return {
        status: 401,
        error: 'Authentication required',
        details: authError?.message,
      };
    }

    // Get the public user ID for database operations
    const publicUserId = await getPublicUserId(supabaseClient, user.id);
    if (!publicUserId) {
      return {
        status: 400,
        error: 'User not found in public users table',
      };
    }

    return {
      supabaseClient,
      user,
      publicUserId,
    };
  } catch (error: unknown) {
    return {
      status: 500,
      error: 'Authentication failed',
      details:
        error instanceof Error ? error.message : 'Unknown authentication error',
    };
  }
}

/**
 * Helper to check if result is an error
 */
export function isAuthError(
  result: AuthenticatedContext | AuthError
): result is AuthError {
  return 'status' in result;
}

/**
 * Helper to create error response from auth error
 */
export function createAuthErrorResponse(authError: AuthError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: authError.error,
      details: authError.details,
    }),
    {
      status: authError.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}
