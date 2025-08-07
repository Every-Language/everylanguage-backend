/**
 * Shared user service for managing user-related operations across edge functions
 * After migration 20250808000004_sync_user_ids_with_auth_ids, public.users.id now equals auth.users.id
 */

export interface PublicUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone_number?: string;
  created_at: string;
  updated_at: string;
}

export class UserService {
  constructor(private supabaseClient: any) {}

  /**
   * Get public user ID from auth user ID
   * Since the migration, auth.users.id equals public.users.id, so we can return directly
   * We still validate that the user exists in the public.users table
   *
   * @param authUserId - The auth.users.id from supabaseClient.auth.getUser()
   * @returns The public.users.id that should be used in created_by fields, or null if not found
   */
  async getPublicUserId(authUserId?: string): Promise<string | null> {
    if (!authUserId) return null;

    // Optimization: Since public.users.id now equals auth.users.id,
    // we can directly use authUserId but still validate the user exists
    const { data } = await this.supabaseClient
      .from('users')
      .select('id')
      .eq('id', authUserId)
      .single();

    return data?.id ?? null;
  }

  /**
   * Get full public user record from auth user ID
   *
   * @param authUserId - The auth.users.id from supabaseClient.auth.getUser()
   * @returns The full public.users record or null if not found
   */
  async getPublicUser(authUserId?: string): Promise<PublicUser | null> {
    if (!authUserId) return null;

    // Optimization: Since public.users.id now equals auth.users.id,
    // we can query directly by id
    const { data } = await this.supabaseClient
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();

    return data;
  }

  /**
   * Create public user record if it doesn't exist
   * This should be called when a new user signs up
   * Note: After the migration, this function should rarely be needed
   * as the trigger automatically creates records with matching IDs
   *
   * @param authUser - The auth user object from supabaseClient.auth.getUser()
   * @returns The created or existing public user record
   */
  async ensurePublicUser(authUser: {
    id: string;
    email?: string;
  }): Promise<PublicUser> {
    // First try to get existing user
    const existingUser = await this.getPublicUser(authUser.id);
    if (existingUser) {
      return existingUser;
    }

    // Create new public user record with the same ID as auth.users.id
    const { data, error } = await this.supabaseClient
      .from('users')
      .insert({
        id: authUser.id, // Use the same ID as auth.users.id
        email: authUser.email ?? '',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create public user: ${error.message}`);
    }

    return data;
  }
}

/**
 * Standalone helper function for quick conversion
 * Optimized: Since public.users.id now equals auth.users.id, we can often skip the database call
 * Use this when you don't need a full UserService instance
 *
 * @param supabaseClient - Supabase client instance
 * @param authUserId - The auth.users.id from supabaseClient.auth.getUser()
 * @param validateExists - Whether to validate the user exists in public.users (default: true)
 * @returns The public user ID or null if not found/invalid
 */
export async function getPublicUserId(
  supabaseClient: any,
  authUserId?: string,
  validateExists: boolean = true
): Promise<string | null> {
  if (!authUserId) return null;

  // Major optimization: Since public.users.id now equals auth.users.id,
  // we can skip the database lookup in many cases
  if (!validateExists) {
    return authUserId;
  }

  // If validation is requested, check that the user exists
  const { data } = await supabaseClient
    .from('users')
    .select('id')
    .eq('id', authUserId)
    .single();

  return data?.id ?? null;
}

/**
 * Fast public user ID getter that skips database validation
 * Use this when you're confident the user exists (e.g., in authenticated contexts)
 *
 * @param authUserId - The auth.users.id from supabaseClient.auth.getUser()
 * @returns The public user ID (same as auth user ID)
 */
export function getPublicUserIdFast(authUserId?: string): string | null {
  return authUserId ?? null;
}
