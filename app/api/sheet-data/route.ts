import { NextResponse } from "next/server";
import { fetchSheetAsObjects, getColumn } from "@/lib/csv";
import { processCompanies } from "@/lib/matching";
import { RESOLVED_COMPANY_DATABASE_SHEET_URL, RESOLVED_LC_MAPPING_SHEET_URL } from "@/lib/config";
import { CompanyRow, DashboardStats, LcMappingRow, SheetDataResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const warnings: string[] = [];

  if (!RESOLVED_LC_MAPPING_SHEET_URL) {
    return NextResponse.json(
      { error: "LC_MAPPING_SHEET_URL is not configured.", detail: "Paste the sheet URL in lib/config.ts." },
      { status: 400 }
    );
  }
  if (!RESOLVED_COMPANY_DATABASE_SHEET_URL) {
    return NextResponse.json(
      {
        error: "COMPANY_DATABASE_SHEET_URL is not configured.",
        detail: "Paste the sheet URL in lib/config.ts.",
      },
      { status: 400 }
    );
  }

  try {
    const [mappingResult, companyResult] = await Promise.all([
      fetchSheetAsObjects(RESOLVED_LC_MAPPING_SHEET_URL, "LC Mapping"),
      fetchSheetAsObjects(RESOLVED_COMPANY_DATABASE_SHEET_URL, "Company Database"),
    ]);

    const mapping: LcMappingRow[] = mappingResult.rows
      .map((row) => ({
        city: getColumn(row, ["City"]),
        district: getColumn(row, ["District"]),
        lc: getColumn(row, ["LC", "Local Committee"]),
      }))
      .filter((row) => row.city || row.district || row.lc);

    const invalidMappingRows = mapping.filter((row) => !row.lc || (!row.city && !row.district));
    if (invalidMappingRows.length > 0) {
      warnings.push(
        `${invalidMappingRows.length} row(s) in the LC Mapping sheet are missing a City/District or LC value and were ignored.`
      );
    }

    const cleanMapping = mapping.filter((row) => row.lc && (row.city || row.district));

    const companies: CompanyRow[] = companyResult.rows
      .map((row) => ({
        companyName: getColumn(row, ["Company Name", "Company"]),
        headquarters: getColumn(row, ["Headquarters", "HQ"]),
      }))
      .filter((row) => row.companyName);

    const missingHqCount = companies.filter((c) => !c.headquarters).length;
    if (missingHqCount > 0) {
      warnings.push(
        `${missingHqCount} compan${missingHqCount === 1 ? "y" : "ies"} in the Company Database have no Headquarters value and will show as Unmatched.`
      );
    }

    const assignedCompanies = processCompanies({ companies, mapping: cleanMapping });

    const stats: DashboardStats = {
      totalCompanies: assignedCompanies.length,
      assignedCompanies: assignedCompanies.filter((c) => c.status === "Assigned").length,
      unmatchedCompanies: assignedCompanies.filter((c) => c.status === "Unmatched").length,
      manualReviewCompanies: assignedCompanies.filter((c) => c.status === "Manual Review Required").length,
      totalLcs: new Set(cleanMapping.map((m) => m.lc.trim()).filter(Boolean)).size,
      possibleDuplicateCount: assignedCompanies.filter((c) => c.isPossibleDuplicate).length,
    };

    const lcList = Array.from(new Set(cleanMapping.map((m) => m.lc.trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "tr")
    );

    const headquartersList = Array.from(
      new Set(companies.map((c) => c.headquarters.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "tr"));

    const payload: SheetDataResponse = {
      companies: assignedCompanies,
      stats,
      lcList,
      headquartersList,
      fetchedAt: new Date().toISOString(),
      warnings,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while loading sheet data.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
