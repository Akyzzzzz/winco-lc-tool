import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes a string for case/locale-insensitive comparison, with special
 * handling for Turkish characters (İ/I/ı, Ş/ş, Ğ/ğ, Ü/ü, Ö/ö, Ç/ç) since the
 * default JS toLowerCase() mishandles the Turkish dotless/dotted I pair.
 * Also collapses internal whitespace and trims.
 */
export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFC")
    // tr-TR locale lower-casing correctly maps İ→i and I→ı, which plain
    // .toLowerCase() gets wrong (it maps both I and İ to the same "i").
    .toLocaleLowerCase("tr-TR")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Normalizes a free-text location string (a mapping sheet's region label,
 * or a company's City/Headquarters value) into a clean, whitespace-only
 * form suitable for exact lookups: Turkish-aware lower-casing, hyphens and
 * slashes treated as word separators, and collapsed whitespace.
 *
 * "Istanbul-Anadolu"  -> "istanbul anadolu"
 * "Istanbul / Kadıköy" -> "istanbul kadıköy"
 * "  Kadıköy   "       -> "kadıköy"
 */
export function toLocationKey(value: string): string {
  return normalizeForMatch(value)
    .replace(/[-/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits an already-normalized location key into its individual word
 * tokens, e.g. "istanbul kadıköy" -> ["istanbul", "kadıköy"].
 */
export function locationKeyTokens(key: string): string[] {
  return key.split(" ").filter(Boolean);
}

/** Formats an ISO timestamp as a short, human-friendly "time ago" style label. */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
