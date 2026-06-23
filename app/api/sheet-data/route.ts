import { NextResponse } from "next/server";
import { fetchSheetAsObjects, getColumn } from "@/lib/csv";
import { processCompanies } from "@/lib/matching";
import { computeAnalytics } from "@/lib/analytics";
import { getCached, setCached } from "@/lib/cache";
import {
  CACHE_TTL_MS,
  RESOLVED_COMPANY_DATABASE_SHEET_URL,
  RESOLVED_LC_MAPPING_SHEET_URL,
  WRITE_BACK_CONFIGURED,
} from "@/lib/config";
import { CompanyRow, DashboardStats, LcMappingRow, SheetDataResponse } from "@/types";

export const dynamic = "force-dynamic";

const CACHE_KEY = "sheet-data";

function buildCacheInfo(cachedAt: number, isFresh: boolean) {
  return {
    cachedAt: new Date(cachedAt).toISOString(),
    ttlMs: CACHE_TTL_MS,
    isFresh,
    ageMs: Date.now() - cachedAt,
  };
}

async function loadFreshPayload(): Promise<SheetDataResponse> {
  const warnings: string[] = [];

  const [mappingResult, companyResult] = await Promise.all([
    fetchSheetAsObjects(RESOLVED_LC_MAPPING_SHEET_URL, "LC Mapping"),
    fetchSheetAsObjects(RESOLVED_COMPANY_DATABASE_SHEET_URL, "Company Database"),
  ]);

  // ---- LC Mapping sheet: City | Assignment (logic unchanged from before) ----
  const mapping: LcMappingRow[] = mappingResult.rows
    .map(({ data }) => ({
      city: getColumn(data, ["City"]),
      district: getColumn(data, ["District"]),
      lc: getColumn(data, ["LC", "Assignment", "Local Committee"]),
    }))
    .filter((row) => row.city || row.district || row.lc);

  const invalidMappingRows = mapping.filter((row) => !row.lc || !row.city);
  if (invalidMappingRows.length > 0) {
    warnings.push(
      `${invalidMappingRows.length} row(s) in the LC Mapping sheet are missing a City or Assignment value and were ignored.`
    );
  }

  const cleanMapping = mapping.filter((row) => row.lc && row.city);

  // ---- Company sheet: Name | City | Sector | Status | Last Updated | Notes | Confidence Score ----
  const companies: CompanyRow[] = companyResult.rows
    .map(({ data, sheetRow }) => ({
      companyName: getColumn(data, ["Name", "Company Name", "Company"]),
      headquarters: getColumn(data, ["City", "Headquarters", "HQ"]),
      sectorRaw: getColumn(data, ["Sector"]),
      statusRaw: getColumn(data, ["Status"]),
      lastUpdatedRaw: getColumn(data, ["Last Updated", "LastUpdated"]),
      notes: getColumn(data, ["Notes"]),
      confidenceScoreRaw: getColumn(data, ["Confidence Score", "Confidence"]),
      rowNumber: sheetRow,
    }))
    .filter((row) => row.companyName);

  const missingCityCount = companies.filter((c) => !c.headquarters).length;
  if (missingCityCount > 0) {
    warnings.push(
      `${missingCityCount} compan${missingCityCount === 1 ? "y" : "ies"} in the Company Database have no City value and will need Manual Review.`
    );
  }

  const { companies: assignedCompanies, lookupMaps } = processCompanies({ companies, mapping: cleanMapping });

  if (lookupMaps.malformedRows.length > 0) {
    warnings.push(
      `${lookupMaps.malformedRows.length} LC Mapping row(s) have "(" in the City field but no parseable district list: ${lookupMaps.malformedRows
        .slice(0, 3)
        .join("; ")}${lookupMaps.malformedRows.length > 3 ? "…" : ""}`
    );
  }

  const stats: DashboardStats = {
    totalCompanies: assignedCompanies.length,
    assignedCompanies: assignedCompanies.filter((c) => c.status === "Assigned").length,
    unmatchedCompanies: assignedCompanies.filter((c) => c.status === "Unmatched").length,
    manualReviewCompanies: assignedCompanies.filter((c) => c.status === "Manual Review Required").length,
    totalLcs: new Set(cleanMapping.map((m) => m.lc.trim()).filter(Boolean)).size,
    possibleDuplicateCount: assignedCompanies.filter((c) => c.isPossibleDuplicate).length,
  };

  const analytics = computeAnalytics(assignedCompanies);

  const lcList = Array.from(new Set(cleanMapping.map((m) => m.lc.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "tr")
  );

  const headquartersList = Array.from(
    new Set(companies.map((c) => c.headquarters.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "tr"));

  const fetchedAtMs = Date.now();

  return {
    companies: assignedCompanies,
    stats,
    analytics,
    lcList,
    headquartersList,
    fetchedAt: new Date(fetchedAtMs).toISOString(),
    warnings,
    cache: buildCacheInfo(fetchedAtMs, true),
    writeBackEnabled: WRITE_BACK_CONFIGURED,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  if (!RESOLVED_LC_MAPPING_SHEET_URL) {
    return NextResponse.json(
      { error: "LC_MAPPING_SHEET_URL is not configured.", detail: "Paste the sheet URL in lib/config.ts or set the env var." },
      { status: 400 }
    );
  }
  if (!RESOLVED_COMPANY_DATABASE_SHEET_URL) {
    return NextResponse.json(
      {
        error: "COMPANY_DATABASE_SHEET_URL is not configured.",
        detail: "Paste the sheet URL in lib/config.ts or set the env var.",
      },
      { status: 400 }
    );
  }

  // Serve from cache when fresh and not explicitly bypassed by Refresh Data.
  if (!forceRefresh) {
    const cached = getCached<SheetDataResponse>(CACHE_KEY, CACHE_TTL_MS);
    if (cached && cached.isFresh) {
      return NextResponse.json({ ...cached.value, cache: buildCacheInfo(cached.cachedAt, true) });
    }
  }

  try {
    const payload = await loadFreshPayload();
    setCached(CACHE_KEY, payload);
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while loading sheet data.";

    // Resilience: if a refresh fails but we still have a (possibly stale)
    // cached copy, prefer showing that with a warning over a hard error.
    const stale = getCached<SheetDataResponse>(CACHE_KEY, CACHE_TTL_MS);
    if (stale) {
      return NextResponse.json({
        ...stale.value,
        warnings: [...stale.value.warnings, `Refresh failed, showing previously loaded data: ${message}`],
        cache: buildCacheInfo(stale.cachedAt, false),
      });
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
