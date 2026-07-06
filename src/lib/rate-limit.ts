export interface RateLimitResult {
  /** Whether this request is permitted. */
  allowed: boolean;
  /** Timestamps to persist for this key: pruned to the window, with `now` appended iff allowed. */
  hits: number[];
  /** Whole seconds until the caller may retry; 0 when allowed. */
  retryAfter: number;
}

/**
 * Pure sliding-window decision. No I/O, no clock — the caller passes `now`.
 *
 * @param hits     prior request timestamps (ms epoch) for one key, oldest-first
 * @param now      current time (ms epoch)
 * @param limit    max requests permitted within the window
 * @param windowMs sliding window length in ms
 */
export function slidingWindow(
  hits: number[],
  now: number,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const cutoff = now - windowMs;
  const recent = hits.filter((t) => t > cutoff);

  if (recent.length >= limit) {
    const oldest = Math.min(...recent);
    const retryAfter = Math.max(Math.ceil((oldest + windowMs - now) / 1000), 1);
    return { allowed: false, hits: recent, retryAfter };
  }

  return { allowed: true, hits: [...recent, now], retryAfter: 0 };
}

const buckets = new Map<string, number[]>();

/**
 * Stateful per-key wrapper over {@link slidingWindow}, backed by a module-level
 * Map. Single-instance, in-memory — acceptable for the current single-node
 * deploy (see the AI_GENERATE_RPM note in the generate-play route).
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
  now: number = Date.now(),
): RateLimitResult {
  const prior = buckets.get(key) ?? [];
  const result = slidingWindow(prior, now, limit, windowMs);
  buckets.set(key, result.hits);
  return result;
}
