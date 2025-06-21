// Environment setup for Jest tests
// This file runs before the test framework is set up

// Load environment variables for testing
process.env.NODE_ENV = 'test';

// Supabase test configuration
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
process.env.SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

// Test database configuration
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Disable external API calls during tests
process.env.DISABLE_EXTERNAL_APIS = 'true';

// Mock Deno environment for Edge Function tests
if (typeof global !== 'undefined') {
  global.Deno = {
    env: {
      get: key => process.env[key],
      set: (key, value) => {
        process.env[key] = value;
      },
    },
    serve: () => ({ finished: Promise.resolve() }),
  };
}
