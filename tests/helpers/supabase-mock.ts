/**
 * tests/helpers/supabase-mock.ts
 * Shared Supabase query chain mock for API tests.
 *
 * Creates a chainable mock that is both a Promise (thenable) and supports
 * all Supabase query builder methods. Every method returns the same chain,
 * and awaiting the chain resolves to the provided value.
 */

import { vi } from "vitest";

export interface ChainResolveValue {
  data?: unknown;
  error?: unknown;
  count?: number;
}

/**
 * Creates a mock Supabase query chain.
 *
 * The returned object:
 * - Resolves as a Promise to `resolveValue` when awaited directly
 * - Has all query methods (select, eq, insert, etc.) that return `this`
 * - `.single()` and `.range()` are also mockable as promises
 */
export function makeQueryChain(
  resolveValue: ChainResolveValue = { data: null, error: null, count: 0 }
) {
  // The chain is backed by a resolved promise for direct awaiting
  const promise = Promise.resolve(resolveValue);

  // All Supabase query builder method names
  const methods = [
    "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "lt", "lte", "gt", "gte", "like", "ilike",
    "is", "in", "contains", "or", "not", "filter",
    "order", "limit", "range", "single", "maybeSingle",
    "head", "count", "throwOnError",
  ];

  // Build the chain object
  const chain: Record<string, unknown> = {
    // Make it thenable — awaiting resolves to resolveValue
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
    // Spread the actual values for destructuring
    ...resolveValue,
  };

  // All methods return the chain (fluent interface)
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });

  // single() resolves to resolveValue (most common terminal method)
  (chain.single as ReturnType<typeof vi.fn>).mockResolvedValue(resolveValue);

  // range() resolves to resolveValue
  (chain.range as ReturnType<typeof vi.fn>).mockResolvedValue(resolveValue);

  return chain;
}

/**
 * Creates a mock Supabase client where all .from() calls return a fresh chain.
 * Use `mockSupabase.from.mockReturnValueOnce(...)` to override specific calls.
 */
export function makeSupabaseMock() {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-test-123", email: "test@example.com" } },
      }),
    },
    from: vi.fn().mockImplementation(() =>
      makeQueryChain({ data: null, error: null, count: 0 })
    ),
  };
  return mockSupabase;
}
