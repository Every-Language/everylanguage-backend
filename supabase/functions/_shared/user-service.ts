/**
 * Shared user service for managing user-related operations across edge functions
 * Handles conversion between auth.users.id and public.users.id
 */

export interface PublicUser {
  id: string;
  auth_uid: string;
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
   * This is the main helper function that converts auth.users.id to public.users.id
   *
   * @param authUserId - The auth.users.id from supabaseClient.auth.getUser()
   * @returns The public.users.id that should be used in created_by fields, or null if not found
   */
  async getPublicUserId(authUserId?: string): Promise<string | null> {
    if (!authUserId) return null;

    const { data } = await this.supabaseClient
      .from('users')
      .select('id')
      .eq('auth_uid', authUserId)
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

    const { data } = await this.supabaseClient
      .from('users')
      .select('*')
      .eq('auth_uid', authUserId)
      .single();

    return data;
  }

  /**
   * Create public user record if it doesn't exist
   * This should be called when a new user signs up
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

    // Create new public user record
    const { data, error } = await this.supabaseClient
      .from('users')
      .insert({
        auth_uid: authUser.id,
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
 * Use this when you don't need a full UserService instance
 */
export async function getPublicUserId(
  supabaseClient: any,
  authUserId?: string
): Promise<string | null> {
  if (!authUserId) return null;

  const { data } = await supabaseClient
    .from('users')
    .select('id')
    .eq('auth_uid', authUserId)
    .single();

  return data?.id ?? null;
}
