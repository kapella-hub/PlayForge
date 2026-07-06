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

function ownPrefix(userId: string): string {
  return `${SCOPED_PREFIX}${userId}-`;
}

export function isOwnDraftKey(key: string, userId: string): boolean {
  return key.startsWith(ownPrefix(userId));
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
 * current user's namespace, preserving each key's timestamp. Each key is
 * migrated inside its own try/catch so a single failure (e.g. quota) never
 * aborts the rest or breaks designer load.
 */
export function adoptLegacyDraftKeys(
  storage: DraftStorage,
  userId: string,
  now: () => number = Date.now,
): void {
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
}
