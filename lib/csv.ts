import Papa from "papaparse";

/** Extracts the bare spreadsheet ID from any Google Sheets URL shape. */
export function extractSpreadsheetId(rawUrl: string): string | null {
  const match = rawUrl.trim().match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

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

  const sheetId = extractSpreadsheetId(url);
  if (!sheetId) {
    // Not a recognizable Google Sheets URL — let it fail naturally on fetch
    // rather than guessing, per the "never guess" rule.
    return url;
  }

  const gidMatch = url.match(/[?#&]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

/** One parsed data row, paired with its 1-based row number in the real sheet (header = row 1). */
export interface SheetRow {
  data: Record<string, string>;
  /** 1-based row number in the actual Google Sheet — header is row 1, so data starts at row 2. */
  sheetRow: number;
}

export interface CsvFetchResult {
  rows: SheetRow[];
  rawHeaders: string[];
}

/**
 * Fetches a Google Sheet as CSV and parses it into row objects keyed by
 * (trimmed) header name, each paired with its real 1-based sheet row number
 * so that later write-back calls (e.g. updating a Status cell) target the
 * correct row even if some rows were filtered out downstream.
 *
 * Throws a descriptive error if the sheet is unreachable or not public.
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

  // skipEmptyLines is intentionally OFF here so the parsed array's index
  // stays perfectly aligned with real sheet row numbers — we filter out
  // blank rows ourselves below, after computing each row's true sheetRow.
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: false,
    transformHeader: (h) => h.trim(),
  });

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0 && parsed.data.length === 0) {
      throw new Error(`The ${label} sheet could not be parsed as CSV.`);
    }
  }

  const rawHeaders = parsed.meta.fields ?? [];

  const rows: SheetRow[] = parsed.data
    .map((data, idx) => ({ data, sheetRow: idx + 2 })) // header is row 1
    .filter(({ data }) => Object.values(data).some((v) => (v ?? "").trim() !== ""));

  return { rows, rawHeaders };
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
