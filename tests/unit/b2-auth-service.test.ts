import { B2AuthService } from '../../supabase/functions/_shared/b2-auth-service';

// Mock globalThis.fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Deno.env.get
const mockEnv = {
  B2_APPLICATION_KEY_ID: 'test-key-id',
  B2_APPLICATION_KEY: 'test-app-key',
  B2_BUCKET_NAME: 'test-bucket',
  B2_BUCKET_ID: 'test-bucket-id',
};

// Mock Deno global
(global as any).Deno = {
  env: {
    get: (key: string) => mockEnv[key as keyof typeof mockEnv],
  },
};

describe('B2AuthService', () => {
  let authService: B2AuthService;

  beforeEach(() => {
    authService = new B2AuthService();
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with valid environment variables', () => {
      expect(() => new B2AuthService()).not.toThrow();
    });

    it('should throw error when missing credentials', () => {
      const originalGet = (global as any).Deno.env.get;
      (global as any).Deno.env.get = jest.fn().mockReturnValue(undefined);

      expect(() => new B2AuthService()).toThrow('Missing B2 credentials');

      (global as any).Deno.env.get = originalGet;
    });

    it('should throw error when credentials contain colons', () => {
      const originalGet = (global as any).Deno.env.get;
      (global as any).Deno.env.get = jest.fn((key: string) => {
        if (key === 'B2_APPLICATION_KEY_ID') return 'test:key:id';
        return mockEnv[key as keyof typeof mockEnv];
      });

      expect(() => new B2AuthService()).toThrow(
        'B2 credentials should not contain colon characters'
      );

      (global as any).Deno.env.get = originalGet;
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const mockResponse = {
        authorizationToken: 'test-auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
        apiInfo: {
          storageApi: {
            apiUrl: 'https://storage.example.com',
            downloadUrl: 'https://storage-download.example.com',
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authService.authenticate();

      expect(result.authorizationToken).toBe('test-auth-token');
      expect(result.apiUrl).toBe('https://storage.example.com');
      expect(result.downloadUrl).toBe('https://storage-download.example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.backblazeb2.com/b2api/v4/b2_authorize_account',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic'),
            'Content-Type': 'application/json',
          }),
          body: '{}',
        })
      );
    });

    it('should return cached credentials on subsequent calls', async () => {
      const mockResponse = {
        authorizationToken: 'test-auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
        json: () => Promise.resolve(mockResponse),
      });

      // First call
      await authService.authenticate();

      // Second call should use cached values
      const result = await authService.authenticate();

      expect(result.authorizationToken).toBe('test-auth-token');
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should handle authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Authentication failed'),
      });

      await expect(authService.authenticate()).rejects.toThrow(
        'B2 authentication failed'
      );
    });

    it('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: () => Promise.resolve('invalid json'),
        json: () =>
          Promise.reject(
            new Error('B2 authentication response parsing failed')
          ),
      });

      await expect(authService.authenticate()).rejects.toThrow(
        'B2 authentication response parsing failed'
      );
    });
  });

  describe('generateDownloadUrl', () => {
    it('should generate download URL successfully', async () => {
      // Mock authenticate
      const mockAuthResponse = {
        authorizationToken: 'test-auth-token',
        apiUrl: 'https://api.example.com',
        downloadUrl: 'https://download.example.com',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () => Promise.resolve(JSON.stringify(mockAuthResponse)),
          json: () => Promise.resolve(mockAuthResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ authorizationToken: 'download-token' }),
        });

      const result = await authService.generateDownloadUrl(
        'test-file.jpg',
        7200
      );

      expect(result).toBe(
        'https://download.example.com/file/test-bucket/test-file.jpg?Authorization=download-token'
      );
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/b2api/v2/b2_get_download_authorization',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'test-auth-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            bucketId: 'test-bucket-id',
            fileNamePrefix: 'test-file.jpg',
            validDurationInSeconds: 7200,
          }),
        })
      );
    });

    it('should handle download URL generation failure', async () => {
      // Mock authenticate
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                authorizationToken: 'test-auth-token',
                apiUrl: 'https://api.example.com',
                downloadUrl: 'https://download.example.com',
              })
            ),
          json: () =>
            Promise.resolve({
              authorizationToken: 'test-auth-token',
              apiUrl: 'https://api.example.com',
              downloadUrl: 'https://download.example.com',
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Invalid file name'),
        });

      await expect(
        authService.generateDownloadUrl('test-file.jpg')
      ).rejects.toThrow('Failed to generate download URL');
    });
  });

  describe('getPublicDownloadUrl', () => {
    it('should generate public download URL', async () => {
      // Set up authentication first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            authorizationToken: 'mock-auth-token',
            apiUrl: 'https://api005.backblazeb2.com',
            downloadUrl: 'https://f005.backblazeb2.com',
          }),
      });

      await authService.authenticate();

      const url = authService.getPublicDownloadUrl('test-file.mp3');

      expect(url).toBe(
        'https://f005.backblazeb2.com/file/test-bucket/test-file.mp3'
      );
    });
  });

  describe('getUploadUrl', () => {
    it('should get upload URL successfully', async () => {
      // Mock authenticate
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(),
          text: () =>
            Promise.resolve(
              JSON.stringify({
                authorizationToken: 'test-auth-token',
                apiUrl: 'https://api.example.com',
                downloadUrl: 'https://download.example.com',
              })
            ),
          json: () =>
            Promise.resolve({
              uploadUrl: 'https://upload.example.com',
              authorizationToken: 'upload-token',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              authorizationToken: 'test-auth-token',
              apiUrl: 'https://api.example.com',
              downloadUrl: 'https://download.example.com',
            }),
        });

      const result = await authService.getUploadUrl();

      expect(result.uploadUrl).toBe('https://upload.example.com');
      expect(result.authorizationToken).toBe('upload-token');
    });
  });

  describe('getConfig', () => {
    it('should return configuration', () => {
      const config = authService.getConfig();

      expect(config).toEqual({
        applicationKeyId: 'test-key-id',
        applicationKey: 'test-app-key',
        bucketName: 'test-bucket',
        bucketId: 'test-bucket-id',
        apiUrl: 'https://api.backblazeb2.com',
      });
    });
  });
});
