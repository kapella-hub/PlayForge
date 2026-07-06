const LEGACY_PREFIX = "playforge-draft-";
const SCOPED_PREFIX = "playforge-draft:";

export interface DraftStorage {
  keys(): string[];
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function scopedDraftKey(userId: string, timestamp: number): string {
  return `${SCOPED_PREFIX}${userId}-${timestamp}`;
}

export function isOwnDraftKey(key: string, userId: string): boolean {
  if (!key.startsWith(SCOPED_PREFIX)) return false;
  const withoutPrefix = key.slice(SCOPED_PREFIX.length);
  const lastDashIndex = withoutPrefix.lastIndexOf('-');
  if (lastDashIndex === -1) return false;
  const extractedUserId = withoutPrefix.slice(0, lastDashIndex);
  const timestamp = withoutPrefix.slice(lastDashIndex + 1);
  // Verify timestamp is all digits
  if (!/^\d+$/.test(timestamp)) return false;
  return extractedUserId === userId;
}

export function isLegacyDraftKey(key: string): boolean {
  return key.startsWith(LEGACY_PREFIX);
}

/** The current user's latest draft key by lexicographic (== chronological) order. */
export function findLatestOwnDraftKey(
  keys: string[],
  userId: string,
): string | null {
  const own = keys.filter((k) => isOwnDraftKey(k, userId)).sort();
  return own.length ? own[own.length - 1] : null;
}

/**
 * One-time, best-effort migration of legacy `playforge-draft-*` keys into the
 * current user's namespace, preserving each key's timestamp. The entire operation
 * is wrapped so any failure (e.g. quota, or storage.keys() error) never
 * aborts or throws, ensuring designer load is never broken.
 */
export function adoptLegacyDraftKeys(
  storage: DraftStorage,
  userId: string,
  now: () => number = Date.now,
): void {
  try {
    for (const key of storage.keys()) {
      if (!isLegacyDraftKey(key)) continue;
      try {
        const value = storage.getItem(key);
        if (value === null) continue;
        const rawTs = key.slice(LEGACY_PREFIX.length);
        const ts = /^\d+$/.test(rawTs) ? Number(rawTs) : now();
        storage.setItem(scopedDraftKey(userId, ts), value);
        storage.removeItem(key);
      } catch {
        // best-effort: skip this key
      }
    }
  } catch {
    // best-effort: if keys() fails, abandon the entire migration
  }
}
