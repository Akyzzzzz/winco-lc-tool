import { extractSpreadsheetId } from "./csv";
import { getAccessToken } from "./sheetsAuth";
import { COMPANY_DATABASE_SHEET_TAB, RESOLVED_COMPANY_DATABASE_SHEET_URL, WRITE_BACK_CONFIGURED } from "./config";

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

let cachedSheetTitle: string | null = null;

function getSpreadsheetId(): string {
  const id = extractSpreadsheetId(RESOLVED_COMPANY_DATABASE_SHEET_URL);
  if (!id) {
    throw new Error("Could not determine the Company Database spreadsheet ID from its configured URL.");
  }
  return id;
}

/** Resolves (and caches) which tab inside the spreadsheet holds the data. */
async function resolveSheetTitle(spreadsheetId: string, accessToken: string): Promise<string> {
  if (COMPANY_DATABASE_SHEET_TAB) return COMPANY_DATABASE_SHEET_TAB;
  if (cachedSheetTitle) return cachedSheetTitle;

  const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Could not read the Company sheet's metadata (HTTP ${res.status}).`);
  }

  const json = await res.json();
  const title = json?.sheets?.[0]?.properties?.title;
  if (!title) {
    throw new Error("Could not determine the Company sheet's tab name.");
  }

  cachedSheetTitle = title;
  return title;
}

export interface CompanyRowUpdate {
  crmStatus?: string;
  notes?: string;
  /** ISO timestamp to stamp into the Last Updated column; defaults to now. */
  lastUpdatedIso?: string;
}

/**
 * Writes Status (D), Last Updated (E), and optionally Notes (F) back to a
 * specific row in the Company sheet using the Sheets API v4 `values:batchUpdate`
 * endpoint. Requires the sheet to be shared with the service account's email
 * as an Editor.
 */
export async function updateCompanyRow(rowNumber: number, update: CompanyRowUpdate): Promise<void> {
  if (!WRITE_BACK_CONFIGURED) {
    throw new Error("Google Sheets write-back isn't configured (missing service account credentials).");
  }
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error(`Invalid sheet row number: ${rowNumber}.`);
  }

  const spreadsheetId = getSpreadsheetId();
  const accessToken = await getAccessToken();
  const sheetTitle = await resolveSheetTitle(spreadsheetId, accessToken);

  const lastUpdatedIso = update.lastUpdatedIso ?? new Date().toISOString();

  const data: { range: string; values: string[][] }[] = [];
  if (update.crmStatus !== undefined) {
    data.push({ range: `'${sheetTitle}'!D${rowNumber}`, values: [[update.crmStatus]] });
  }
  data.push({ range: `'${sheetTitle}'!E${rowNumber}`, values: [[lastUpdatedIso]] });
  if (update.notes !== undefined) {
    data.push({ range: `'${sheetTitle}'!F${rowNumber}`, values: [[update.notes]] });
  }

  const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(
        "Google rejected the write. Make sure the Company sheet is shared with the service account's email (the \"client_email\" from its JSON key) as an Editor."
      );
    }
    const text = await res.text();
    throw new Error(`Failed to write back to the Company sheet (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }
}
