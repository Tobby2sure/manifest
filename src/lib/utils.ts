import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCompactDuration(date: Date): string {
  const ms = date.getTime() - Date.now()
  if (ms <= 0) return "0m"
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

/**
 * Truncate a string by user-perceived character (grapheme) rather than
 * UTF-16 code unit, so emoji, ZWJ sequences, and combining marks don't
 * get cut in half. Returns the original string if it's already within
 * the limit.
 */
export function truncateGraphemes(
  str: string,
  max: number,
  ellipsis = "..."
): string {
  if (str.length <= max) return str
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
  let out = ""
  let count = 0
  for (const { segment } of segmenter.segment(str)) {
    if (count >= max) return out + ellipsis
    out += segment
    count++
  }
  return out
}
