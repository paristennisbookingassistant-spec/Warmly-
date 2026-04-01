/**
 * Vitest global test setup.
 * Runs before every test file.
 */

// Set test environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_KEY = "test-service-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
