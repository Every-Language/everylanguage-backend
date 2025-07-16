// Test setup for Jest
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Deno global for Edge Functions
(global as any).Deno = {
  env: {
    get: (key: string) => process.env[key] || '',
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
        return total + (bit?.length || 0);
      }, 0);
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
    }

    // Add toString method to help with debugging
    toString() {
      return `[object File] { name: "${this.name}", type: "${this.type}", size: ${this.size} }`;
    }

    // Add valueOf method
    valueOf() {
      return this;
    }
  } as any;
}

// Mock crypto.subtle for tests
if (!global.crypto) {
  global.crypto = {
    subtle: {
      digest: jest
        .fn()
        .mockImplementation(() => Promise.resolve(new ArrayBuffer(20))),
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
