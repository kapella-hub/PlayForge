const PREFIX = "playforge-snap:";

export function snapPreferenceKey(userId: string): string {
  return `${PREFIX}${userId}`;
}

export function loadSnapPreference(userId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(snapPreferenceKey(userId));
    if (raw === null) return true; // default ON
    return raw !== "false"; // only an explicit "false" turns snapping off
  } catch {
    return true;
  }
}

export function saveSnapPreference(userId: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(snapPreferenceKey(userId), String(enabled));
  } catch {
    // best-effort: persistence failure must never break the designer
  }
}
