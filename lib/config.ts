/**
 * ============================================================================
 * WINCO LC ASSIGNMENT TOOL — DATA SOURCE CONFIGURATION
 * ============================================================================
 *
 * Paste your two Google Sheet URLs below. Each sheet must be shared with
 * "Anyone with the link can view" (for reading) AND — for the Company
 * sheet, since CRM status edits write back to it — explicitly shared with
 * your service account email (see GOOGLE_SERVICE_ACCOUNT_EMAIL below) as an
 * Editor. You can paste either a normal share link or a CSV export link;
 * lib/csv.ts normalizes whichever one you paste.
 * ============================================================================
 */

/** Sheet 1 — LC Mapping Database (static). Columns: City | Assignment */
export const LC_MAPPING_SHEET_URL = "";

/** Sheet 2 — Company Database (dynamic). Columns: Name | City | Sector | Status | Last Updated | Notes | Confidence Score */
export const COMPANY_DATABASE_SHEET_URL = "";

/**
 * Optional: configure the two sheet URLs via environment variables instead
 * (recommended for production so URLs aren't committed to source control).
 * Env vars take precedence over the constants above when set.
 */
export const RESOLVED_LC_MAPPING_SHEET_URL =
  process.env.LC_MAPPING_SHEET_URL?.trim() || LC_MAPPING_SHEET_URL;

export const RESOLVED_COMPANY_DATABASE_SHEET_URL =
  process.env.COMPANY_DATABASE_SHEET_URL?.trim() || COMPANY_DATABASE_SHEET_URL;

/**
 * ----------------------------------------------------------------------------
 * GOOGLE SHEETS WRITE-BACK (service account)
 * ----------------------------------------------------------------------------
 * Required only if you want CRM Status/Notes edits made in the dashboard to
 * persist back into the Company sheet's columns D/E/F. If these aren't
 * configured, the app still works fully for reading/matching/exporting —
 * status edits just won't be saved (the UI will say so).
 *
 * Two ways to provide the service account credentials:
 *
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY — the *entire* downloaded JSON key file,
 *      pasted as a single-line string (recommended for Vercel).
 *
 *   2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
 *      separately. The private key's newlines must be escaped as literal
 *      "\n" when pasted into a Vercel env var; lib/sheetsAuth.ts un-escapes
 *      them at runtime.
 *
 * Remember to share BOTH Google Sheets with the service account's email
 * address (found in the JSON key as "client_email") — Viewer is enough for
 * the LC Mapping sheet, Editor is required for the Company sheet.
 */
export const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim() || "";
export const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || "";
export const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY =
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() || "";

/**
 * Optional override for which tab (sheet name) inside the Company spreadsheet
 * holds the data. If unset, the app auto-detects the first tab on load and
 * caches the result in memory.
 */
export const COMPANY_DATABASE_SHEET_TAB = process.env.COMPANY_DATABASE_SHEET_TAB?.trim() || "";

/** True once enough credential material is present to attempt write-back. */
export const WRITE_BACK_CONFIGURED = Boolean(
  GOOGLE_SERVICE_ACCOUNT_KEY || (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
);

/**
 * ----------------------------------------------------------------------------
 * PERFORMANCE CACHE
 * ----------------------------------------------------------------------------
 * Both sheets are cached in memory for this long before a normal page load
 * will re-fetch them. The "Refresh Data" button always bypasses this cache.
 *
 * Note for Vercel: serverless functions are stateless between cold starts,
 * and concurrent invocations may land on different instances — so this is a
 * best-effort, per-instance cache, not a globally consistent one. It still
 * meaningfully cuts down on redundant fetches for a low-to-moderate traffic
 * internal tool, which is what "in memory, 10 minutes" calls for here.
 */
export const CACHE_TTL_MS = 10 * 60 * 1000;
