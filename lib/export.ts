import * as XLSX from "xlsx";
import { AssignedCompany } from "@/types";

function toExportRows(companies: AssignedCompany[]) {
  return companies.map((c) => ({
    "Company Name": c.companyName,
    Headquarters: c.headquarters,
    "Assigned LC": c.assignedLc ?? "",
    Status: c.status,
    "Matched On": c.matchSource ?? "",
    "Candidate LCs": c.candidateLcs.join(", "),
    "Possible Duplicate": c.isPossibleDuplicate ? "Yes" : "No",
  }));
}

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

export function exportToCsv(companies: AssignedCompany[], filename = "winco-lc-assignments.csv") {
  const rows = toExportRows(companies);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  // Prepend UTF-8 BOM so Excel renders Turkish characters correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}

export function exportToXlsx(companies: AssignedCompany[], filename = "winco-lc-assignments.xlsx") {
  const rows = toExportRows(companies);
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 12 }, { wch: 28 }, { wch: 16 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "LC Assignments");
  XLSX.writeFile(workbook, filename);
}
