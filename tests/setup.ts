// Test setup for Jest
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Deno global for Edge Functions
(global as any).Deno = {
  env: {
    get: (key: string) => process.env[key] ?? '',
  },
};

// Mock fetch if not available (Node.js < 18)
if (typeof global.fetch === 'undefined') {
  const {
    default: fetch,
    Headers,
    Request,
    Response,
    FormData,
  } = require('node-fetch');
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;

  // Only set FormData if it's not already available
  if (typeof global.FormData === 'undefined') {
    global.FormData = FormData;
  }
}

// Mock File constructor for tests
if (typeof global.File === 'undefined') {
  global.File = class MockFile {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    webkitRelativePath: string;

    constructor(
      bits: any[],
      name: string,
      options: { type?: string; lastModified?: number } = {}
    ) {
      this.name = name;
      this.size = bits.reduce((total, bit) => {
        if (typeof bit === 'string') return total + bit.length;
        if (bit instanceof ArrayBuffer) return total + bit.byteLength;
        if (bit instanceof Uint8Array) return total + bit.length;
        return total + (bit?.length ?? 0);
      }, 0);
      this.type = options.type ?? '';
      this.lastModified = options.lastModified ?? Date.now();
      this.webkitRelativePath = '';

      // Ensure name property is enumerable and non-writable
      Object.defineProperty(this, 'name', {
        value: name,
        writable: false,
        enumerable: true,
        configurable: false,
      });

      // Add toString method to help with debugging
      Object.defineProperty(this, 'toString', {
        value: () =>
          `[object File] { name: "${name}", size: ${this.size}, type: "${this.type}" }`,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }

    // Implement basic File methods for compatibility
    stream(): ReadableStream<Uint8Array> {
      return new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('test content'));
          controller.close();
        },
      });
    }

    text(): Promise<string> {
      return Promise.resolve('test content');
    }

    arrayBuffer(): Promise<ArrayBuffer> {
      const encoder = new TextEncoder();
      return Promise.resolve(encoder.encode('test content').buffer);
    }

    slice(start?: number, end?: number, contentType?: string): Blob {
      // Simple implementation for testing
      return new (global as any).Blob(['test content'], { type: contentType });
    }
  } as any;
}

// Mock crypto.subtle for tests
if (!global.crypto) {
  global.crypto = {
    subtle: {
      digest: jest
        .fn()
        .mockImplementation(() => Promise.resolve(new ArrayBuffer(32))), // SHA-256 hash size
      importKey: jest.fn().mockImplementation(() =>
        Promise.resolve({
          type: 'secret',
          extractable: false,
          algorithm: { name: 'HMAC', hash: 'SHA-256' },
          usages: ['sign'],
        })
      ),
      sign: jest.fn().mockImplementation(() => {
        // Return a mock signature as ArrayBuffer (32 bytes for HMAC-SHA256)
        const mockSignature = new ArrayBuffer(32);
        const view = new Uint8Array(mockSignature);
        // Fill with some deterministic mock data for consistent test results
        for (let i = 0; i < 32; i++) {
          view[i] = i % 256;
        }
        return Promise.resolve(mockSignature);
      }),
    },
  } as any;
}

// Jest setup file - runs after environment setup but before tests

// Global test configuration
import { jest, beforeAll, afterAll, afterEach } from '@jest/globals';

// Mock console methods if needed (can be overridden in specific tests)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Suppress console output during tests unless explicitly needed
beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test timeout
jest.setTimeout(30000);

// Mock Supabase client for tests
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(),
      download: jest.fn(),
      remove: jest.fn(),
    })),
  },
};

// Global test utilities
declare global {
  var testUtils: {
    mockSupabaseClient: typeof mockSupabaseClient;
  };
}

global.testUtils = {
  mockSupabaseClient,
  // Add more test utilities as needed
};

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});
