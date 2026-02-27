import { formatDistanceToNow } from "date-fns";

/**
 * SQLite datetime('now') returns UTC strings like "2025-01-15 10:30:00".
 * We normalise to ISO 8601 with a 'Z' suffix so JS Date parses as UTC,
 * then let date-fns produce the human-readable relative string.
 */
export function formatRelativeTime(dateStr: string): string {
  const utcStr = dateStr.endsWith("Z") ? dateStr : `${dateStr.replace(" ", "T")}Z`;
  const date = new Date(utcStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return formatDistanceToNow(date, { addSuffix: true });
}
