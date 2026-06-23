// ============================================================================
// SIMPLE IN-MEMORY TTL CACHE
// ============================================================================
// Module-scoped (lives for the lifetime of one serverless function instance
// / one long-running Node process). Good enough to "prevent unnecessary
// refetching" of the two Google Sheets for a low/moderate-traffic internal
// tool, per the brief. Not a distributed cache — see the note in
// lib/config.ts about Vercel's per-instance behavior.

interface CacheEntry<T> {
  value: T;
  cachedAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string, ttlMs: number): { value: T; cachedAt: number; isFresh: boolean } | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const ageMs = Date.now() - entry.cachedAt;
  return { value: entry.value, cachedAt: entry.cachedAt, isFresh: ageMs < ttlMs };
}

export function setCached<T>(key: string, value: T): void {
  store.set(key, { value, cachedAt: Date.now() });
}

export function clearCached(key: string): void {
  store.delete(key);
}
