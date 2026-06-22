import Papa from "papaparse";

/**
 * Accepts a Google Sheets URL in *any* common shape and returns a direct
 * CSV export URL. Handles:
 *   - https://docs.google.com/spreadsheets/d/<ID>/edit#gid=123
 *   - https://docs.google.com/spreadsheets/d/<ID>/edit?usp=sharing
 *   - https://docs.google.com/spreadsheets/d/<ID>/export?format=csv&gid=123
 *   - Already-a-CSV link (returned unchanged)
 */
export function toCsvExportUrl(rawUrl: string): string {
  const url = rawUrl.trim();

  if (!url) {
    throw new Error("No Google Sheet URL configured.");
  }

  // Already a CSV export / publish link — use as-is.
  if (url.includes("/export") || url.includes("output=csv") || url.includes("/pub?")) {
    return url;
  }

  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    // Not a recognizable Google Sheets URL — let it fail naturally on fetch
    // rather than guessing, per the "never guess" rule.
    return url;
  }

  const sheetId = idMatch[1];
  const gidMatch = url.match(/[?#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export interface CsvFetchResult {
  rows: Record<string, string>[];
  rawHeaders: string[];
}

/**
 * Fetches a Google Sheet as CSV and parses it into an array of objects keyed
 * by (trimmed, lower-cased) header name. Throws a descriptive error if the
 * sheet is unreachable or not public.
 */
export async function fetchSheetAsObjects(rawUrl: string, label: string): Promise<CsvFetchResult> {
  const csvUrl = toCsvExportUrl(rawUrl);

  let response: Response;
  try {
    response = await fetch(csvUrl, { cache: "no-store" });
  } catch (err) {
    throw new Error(
      `Could not reach the ${label} sheet. Check your network connection and the sheet URL.`
    );
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `The ${label} sheet is not public. Set sharing to "Anyone with the link can view" and try again.`
      );
    }
    throw new Error(`The ${label} sheet could not be loaded (HTTP ${response.status}).`);
  }

  const csvText = await response.text();

  // Google sometimes returns an HTML sign-in page instead of CSV when a
  // sheet isn't actually public. Detect that case explicitly.
  if (csvText.trim().startsWith("<!DOCTYPE html") || csvText.trim().startsWith("<html")) {
    throw new Error(
      `The ${label} sheet returned a sign-in page instead of data. Set sharing to "Anyone with the link can view".`
    );
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    // PapaParse reports row-level issues; surface only if rows are unusable.
    const fatal = parsed.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0 && parsed.data.length === 0) {
      throw new Error(`The ${label} sheet could not be parsed as CSV.`);
    }
  }

  const rawHeaders = parsed.meta.fields ?? [];

  return { rows: parsed.data, rawHeaders };
}

/**
 * Finds a column value on a row by trying a list of acceptable header names,
 * case-insensitively and trimmed, since spreadsheet owners may type
 * "Headquarters", "HQ", "headquarters " etc.
 */
export function getColumn(
  row: Record<string, string>,
  candidates: string[]
): string {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const found = keys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase());
    if (found) return (row[found] ?? "").trim();
  }
  return "";
}
