import * as XLSX from "xlsx";
import { AssignedCompany, SECTOR_VALUES, STATUS_VALUES } from "@/types";
import { STATUS_CONFIG } from "@/lib/status";
import { computeAnalytics } from "@/lib/analytics";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function writeXlsx(rows: Record<string, string | number>[], sheetName: string, filename: string, colWidths?: number[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  if (colWidths) worksheet["!cols"] = colWidths.map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

// ============================================================================
// MAIN FILTERED-DATA EXPORT (every column, including CRM + sector + confidence)
// ============================================================================

function toExportRows(companies: AssignedCompany[]) {
  return companies.map((c) => ({
    "Company Name": c.companyName,
    City: c.headquarters,
    "Assigned LC": c.assignedLc ?? "",
    "LC Match Status": c.status,
    "Matched On": c.matchSource ?? "",
    "Candidate LCs": c.candidateLcs.join(", "),
    Sector: c.sector,
    "Sector Source": c.sectorSource === "ai" ? "AI classified" : "From sheet",
    "CRM Status": STATUS_CONFIG[c.crmStatus].label,
    Notes: c.notes,
    "Last Updated": c.lastUpdated ?? "",
    "Confidence Score": c.confidenceScore,
    "Possible Duplicate": c.isPossibleDuplicate ? "Yes" : "No",
  }));
}

const MAIN_EXPORT_WIDTHS = [30, 18, 20, 20, 12, 26, 12, 14, 18, 30, 14, 16, 16];

export function exportToCsv(companies: AssignedCompany[], filename = "winco-companies.csv") {
  const rows = toExportRows(companies);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  // Prepend UTF-8 BOM so Excel renders Turkish characters correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export function exportToXlsx(companies: AssignedCompany[], filename = "winco-companies.xlsx") {
  writeXlsx(toExportRows(companies), "Companies", filename, MAIN_EXPORT_WIDTHS);
}

// ============================================================================
// LC ASSIGNMENT REPORT — one row per LC, pipeline-stage breakdown + health score
// ============================================================================

export function exportLcReport(companies: AssignedCompany[], filename = "winco-lc-assignment-report.xlsx") {
  const analytics = computeAnalytics(companies);
  const healthByLc = new Map(analytics.lcHealthScores.map((h) => [h.lc, h.healthScore]));

  const byLc = new Map<string, AssignedCompany[]>();
  const unassigned: AssignedCompany[] = [];

  for (const c of companies) {
    if (c.assignedLc) {
      const list = byLc.get(c.assignedLc) ?? [];
      list.push(c);
      byLc.set(c.assignedLc, list);
    } else {
      unassigned.push(c);
    }
  }

  function rowFor(label: string, list: AssignedCompany[], healthScore: number | "") {
    const row: Record<string, string | number> = {
      LC: label,
      "Total Companies": list.length,
    };
    for (const status of STATUS_VALUES) {
      row[STATUS_CONFIG[status].label] = list.filter((c) => c.crmStatus === status).length;
    }
    row["Health Score"] = healthScore;
    return row;
  }

  const rows = Array.from(byLc.entries())
    .sort((a, b) => a[0].localeCompare(b[0], "tr"))
    .map(([lc, list]) => rowFor(lc, list, healthByLc.get(lc) ?? 0));

  if (unassigned.length > 0) {
    rows.push(rowFor("— Unassigned (Unmatched / Manual Review) —", unassigned, ""));
  }

  const widths = [32, 16, ...STATUS_VALUES.map(() => 14), 14];
  writeXlsx(rows, "LC Assignment Report", filename, widths);
}

// ============================================================================
// SECTOR BREAKDOWN REPORT — one row per sector, pipeline-stage breakdown + avg confidence
// ============================================================================

export function exportSectorReport(companies: AssignedCompany[], filename = "winco-sector-breakdown-report.xlsx") {
  const bySector = new Map<string, AssignedCompany[]>();
  for (const c of companies) {
    const list = bySector.get(c.sector) ?? [];
    list.push(c);
    bySector.set(c.sector, list);
  }

  const rows = SECTOR_VALUES.filter((s) => (bySector.get(s) ?? []).length > 0).map((sector) => {
    const list = bySector.get(sector) ?? [];
    const avgConfidence =
      list.length === 0 ? 0 : Math.round(list.reduce((sum, c) => sum + c.confidenceScore, 0) / list.length);

    const row: Record<string, string | number> = {
      Sector: sector,
      "Total Companies": list.length,
      "Avg Confidence Score": avgConfidence,
    };
    for (const status of STATUS_VALUES) {
      row[STATUS_CONFIG[status].label] = list.filter((c) => c.crmStatus === status).length;
    }
    return row;
  });

  const widths = [16, 16, 18, ...STATUS_VALUES.map(() => 14)];
  writeXlsx(rows, "Sector Breakdown Report", filename, widths);
}
