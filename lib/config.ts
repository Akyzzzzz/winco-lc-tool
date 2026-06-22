/**
 * ============================================================================
 * WINCO LC ASSIGNMENT TOOL — DATA SOURCE CONFIGURATION
 * ============================================================================
 *
 * Paste your two Google Sheet URLs below. Each sheet must be published /
 * shared as "Anyone with the link can view". You can paste either:
 *   - A normal share link  (https://docs.google.com/spreadsheets/d/XXXX/edit#gid=0)
 *   - A CSV export link    (https://docs.google.com/spreadsheets/d/XXXX/export?format=csv)
 * Both formats work — see lib/csv.ts, which normalizes whichever one you paste.
 *
 * No Google Cloud project, no API key, and no OAuth are required.
 * ============================================================================
 */

/** Sheet 1 — LC Mapping Database (static). Columns: City | District | LC */
export const LC_MAPPING_SHEET_URL = "";

/** Sheet 2 — Company Database (dynamic). Columns: Company Name | Headquarters */
export const COMPANY_DATABASE_SHEET_URL = "";

/**
 * Optional: you can instead (or additionally) configure these via environment
 * variables, which is recommended for production deployments (Vercel) so the
 * URLs aren't hard-coded in source control. Env vars take precedence over the
 * constants above when set. See .env.example.
 */
export const RESOLVED_LC_MAPPING_SHEET_URL =
  process.env.LC_MAPPING_SHEET_URL?.trim() || LC_MAPPING_SHEET_URL;

export const RESOLVED_COMPANY_DATABASE_SHEET_URL =
  process.env.COMPANY_DATABASE_SHEET_URL?.trim() || COMPANY_DATABASE_SHEET_URL;

/** How long the server caches fetched sheet data before treating it as stale (ms). */
export const CACHE_TTL_MS = 60_000;
