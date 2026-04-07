export function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseTimestamp(str: string): number {
  const parts = str.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1] || "0");
}

export function appendTimestampToUrl(url: string, seconds: number): string {
  if (!url || !seconds) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${seconds}`;
}
