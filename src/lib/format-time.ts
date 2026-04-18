/**
 * Compact relative-time formatter.
 *
 * Returns short strings: "now", "5m", "3h", "12d", "3mo", "2y".
 * With `withSuffix: true`, suffixes "ago" for past and "in X" is NOT used —
 * we always format as a non-negative distance, so pass the larger-magnitude
 * direction yourself (e.g. timeRemaining uses expiresAt, postedAgo uses createdAt).
 */
export function formatShort(
  date: Date,
  options: { withSuffix?: boolean } = {}
): string {
  const { withSuffix = false } = options;
  const now = Date.now();
  const t = date.getTime();
  const diffMs = Math.abs(now - t);

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return withSuffix ? "just now" : "now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m${withSuffix ? " ago" : ""}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h${withSuffix ? " ago" : ""}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d${withSuffix ? " ago" : ""}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo${withSuffix ? " ago" : ""}`;

  const years = Math.floor(months / 12);
  return `${years}y${withSuffix ? " ago" : ""}`;
}
