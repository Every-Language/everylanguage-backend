import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  UserService,
  getPublicUserId,
} from '../../supabase/functions/_shared/user-service';

describe('UserService', () => {
  let userService: UserService;
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    userService = new UserService(mockSupabaseClient);
  });

  describe('getPublicUserId', () => {
    it('should return public user ID when auth user ID is found', async () => {
      const mockAuthUserId = 'auth-user-123';
      // After migration, public.users.id equals auth.users.id
      mockSupabaseClient.single.mockResolvedValue({
        data: { id: mockAuthUserId },
        error: null,
      });

      const result = await userService.getPublicUserId(mockAuthUserId);

      expect(result).toBe(mockAuthUserId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
      // Now queries by id directly instead of auth_uid
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockAuthUserId);
    });

    it('should return null when auth user ID is not provided', async () => {
      const result = await userService.getPublicUserId();
      expect(result).toBeNull();
    });

    it('should return null when auth user ID is undefined', async () => {
      const result = await userService.getPublicUserId(undefined);
      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await userService.getPublicUserId(
        'non-existent-auth-user'
      );
      expect(result).toBeNull();
    });

    it('should return null when database query fails', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await userService.getPublicUserId('auth-user-123');
      expect(result).toBeNull();
    });
  });

  describe('getPublicUser', () => {
    it('should return full public user record when found', async () => {
      const mockAuthUserId = 'auth-user-123';
      const mockPublicUser = {
        id: mockAuthUserId, // After migration, id equals the auth user id
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockPublicUser,
        error: null,
      });

      const result = await userService.getPublicUser(mockAuthUserId);

      expect(result).toEqual(mockPublicUser);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      // Now queries by id directly instead of auth_uid
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockAuthUserId);
    });

    it('should return null when auth user ID is not provided', async () => {
      const result = await userService.getPublicUser();
      expect(result).toBeNull();
    });

    it('should return null when user is not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await userService.getPublicUser('non-existent-auth-user');
      expect(result).toBeNull();
    });
  });

  describe('ensurePublicUser', () => {
    it('should return existing user if found', async () => {
      const authUserId = 'auth-user-123';
      const existingUser = {
        id: authUserId, // Same ID as auth user after migration
        email: 'test@example.com',
      };

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: existingUser,
        error: null,
      });

      const result = await userService.ensurePublicUser({
        id: authUserId,
        email: 'test@example.com',
      });

      expect(result).toEqual(existingUser);
      expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
    });

    it('should create new user if not found', async () => {
      const authUserId = 'auth-user-123';
      const newUser = {
        id: authUserId, // Same ID as auth user after migration
        email: 'test@example.com',
      };

      // First call for getPublicUser (not found)
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        // Second call for insert
        .mockResolvedValueOnce({
          data: newUser,
          error: null,
        });

      const result = await userService.ensurePublicUser({
        id: authUserId,
        email: 'test@example.com',
      });

      expect(result).toEqual(newUser);
      // Now inserts with id directly instead of auth_uid
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        id: authUserId,
        email: 'test@example.com',
      });
    });

    it('should handle missing email by using empty string', async () => {
      const authUserId = 'auth-user-123';
      const newUser = {
        id: authUserId,
        email: '',
      };

      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: newUser,
          error: null,
        });

      const result = await userService.ensurePublicUser({
        id: authUserId,
      });

      expect(result).toEqual(newUser);
      // Now inserts with id directly instead of auth_uid
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith({
        id: authUserId,
        email: '',
      });
    });

    it('should throw error when user creation fails', async () => {
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: null,
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database constraint violation' },
        });

      await expect(
        userService.ensurePublicUser({
          id: 'auth-user-123',
          email: 'test@example.com',
        })
      ).rejects.toThrow(
        'Failed to create public user: Database constraint violation'
      );
    });
  });
});

describe('getPublicUserId standalone function', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
  });

  it('should return public user ID when found', async () => {
    const mockAuthUserId = 'auth-user-123';
    mockSupabaseClient.single.mockResolvedValue({
      data: { id: mockAuthUserId },
      error: null,
    });

    const result = await getPublicUserId(mockSupabaseClient, mockAuthUserId);

    expect(result).toBe(mockAuthUserId);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('id');
    // Now queries by id directly instead of auth_uid
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockAuthUserId);
  });

  it('should return null when auth user ID is not provided', async () => {
    const result = await getPublicUserId(mockSupabaseClient);
    expect(result).toBeNull();
  });

  it('should return null when user is not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await getPublicUserId(
      mockSupabaseClient,
      'non-existent-auth-user'
    );
    expect(result).toBeNull();
  });

  it('should return auth user ID directly when validation is disabled', async () => {
    const authUserId = 'auth-user-123';

    // Test the optimization feature
    const result = await getPublicUserId(mockSupabaseClient, authUserId, false);

    expect(result).toBe(authUserId);
    // Should not make any database calls when validation is disabled
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });
});
