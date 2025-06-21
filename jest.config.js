export default {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  roots: ['<rootDir>/tests', '<rootDir>/supabase/functions'],
  testMatch: ['**/__tests__/**/*.{ts,js}', '**/?(*.)+(spec|test).{ts,js}'],

  // TypeScript handling
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          // Override tsconfig for tests
          compilerOptions: {
            module: 'commonjs',
            target: 'es2022',
            moduleResolution: 'node',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            resolveJsonModule: true,
            isolatedModules: false,
          },
        },
      },
    ],
  },

  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
    '^@/functions/(.*)$': '<rootDir>/supabase/functions/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'supabase/functions/**/*.ts',
    'scripts/**/*.ts',
    'src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Setup and teardown
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Global settings
  verbose: true,
  clearMocks: true,
  restoreMocks: true,

  // Timeout for tests (useful for integration tests)
  testTimeout: 30000,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/supabase/.temp/',
    '/supabase/.branches/',
  ],

  // Environment variables for tests
  setupFiles: ['<rootDir>/tests/env.setup.js'],

  // For testing Edge Functions (Deno environment)
  globals: {
    'ts-jest': {
      useESM: false,
    },
    Deno: {
      env: {
        get: jest.fn(),
      },
    },
  },
};
