import { corsHeaders } from './request-parser.ts';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: string
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    details,
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Create CORS preflight response
 */
export function createCorsResponse(): Response {
  return new Response(null, { headers: corsHeaders });
}

/**
 * Handle unexpected errors in a standardized way
 */
export function handleUnexpectedError(error: unknown): Response {
  console.error('Unexpected error:', error);

  return createErrorResponse(
    'Internal server error',
    500,
    error instanceof Error ? error.message : 'Unknown error occurred'
  );
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(details: string): Response {
  return createErrorResponse('Validation failed', 400, details);
}

/**
 * Create parsing error response
 */
export function createParsingErrorResponse(details: string): Response {
  return createErrorResponse('Request parsing failed', 400, details);
}

/**
 * Create upload error response
 */
export function createUploadErrorResponse(details: string): Response {
  return createErrorResponse('Upload failed', 500, details);
}

/**
 * Create database error response
 */
export function createDatabaseErrorResponse(details: string): Response {
  return createErrorResponse('Database error', 500, details);
}
