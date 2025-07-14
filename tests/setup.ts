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
  const { default: fetch, Headers, Request, Response } = require('node-fetch');
  global.fetch = fetch;
  global.Headers = Headers;
  global.Request = Request;
  global.Response = Response;
}

// Mock File constructor for tests
if (typeof global.File === 'undefined') {
  global.File = class MockFile {
    name: string;
    size: number;
    type: string;

    constructor(bits: any[], name: string, options: { type?: string } = {}) {
      this.name = name;
      this.size = bits.reduce((total, bit) => total + bit.length, 0);
      this.type = options.type || '';
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
