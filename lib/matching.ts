import {
  AssignedCompany,
  AssignmentStatus,
  CompanyRow,
  LcMappingRow,
  MatchSource,
} from "@/types";
import { locationKeyTokens, normalizeForMatch, toLocationKey } from "./utils";
import { resolveSector } from "./sectors";
import { resolveStatus } from "./status";

// ============================================================================
// LOOKUP ENTRY TYPES
// ============================================================================

/** Everything the lookup map needs for one normalized district/city key. */
interface LookupEntry {
  /** Distinct LC names this key resolves to (length > 1 means the sheet has a conflict). */
  lcs: string[];
  /** The original, human-readable label as written in the mapping sheet (for display). */
  label: string;
}

export interface LcLookupMaps {
  /** Normalized district name -> lookup entry. Built from parenthetical district lists. */
  districtToLc: Map<string, LookupEntry>;
  /** Normalized city/region name -> lookup entry. Built from plain city rows and region labels. */
  cityToLc: Map<string, LookupEntry>;
  /** True if at least one mapping row contained a parenthetical district list. */
  parsedAnyDistrictList: boolean;
  /** Mapping rows whose City field had "(" but yielded zero parsed districts (likely malformed). */
  malformedRows: string[];
}

// ============================================================================
// PARSING THE LC MAPPING SHEET
// ============================================================================

/**
 * Parses one LC Mapping sheet row's City field, which can be either:
 *   - A plain city/region name, e.g. "Sakarya"
 *   - A region label followed by a parenthetical district list, e.g.
 *     "Istanbul-Anadolu (Adalar, Ataşehir, Beykoz, ... Üsküdar)"
 */
function parseCityField(rawCity: string): { regionLabel: string; districts: string[] } {
  const trimmed = rawCity.trim();
  const match = trimmed.match(/^(.*?)\s*\(([^()]*)\)\s*$/);

  if (!match) {
    return { regionLabel: trimmed, districts: [] };
  }

  const regionLabel = match[1].trim();
  const districts = match[2]
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  return { regionLabel: regionLabel || trimmed, districts };
}

function addToLookup(map: Map<string, LookupEntry>, rawLabel: string, lc: string) {
  const key = toLocationKey(rawLabel);
  if (!key || !lc) return;

  const existing = map.get(key);
  if (existing) {
    if (!existing.lcs.includes(lc)) existing.lcs.push(lc);
  } else {
    map.set(key, { lcs: [lc], label: rawLabel.trim() });
  }
}

/**
 * Builds the district-to-LC and city-to-LC lookup maps once per data
 * refresh (not per company), giving O(1) lookups for every company row
 * regardless of dataset size (rule #10 from the mapping-logic spec).
 *
 * Supports both sheet formats at once:
 *   - Current format: City = "Region (District1, District2, ...)", Assignment = LC
 *   - Legacy format: City = plain city name, District = single district, LC = LC
 */
export function buildLcLookupMaps(mapping: LcMappingRow[]): LcLookupMaps {
  const districtToLc = new Map<string, LookupEntry>();
  const cityToLc = new Map<string, LookupEntry>();
  const malformedRows: string[] = [];
  let parsedAnyDistrictList = false;

  for (const row of mapping) {
    if (!row.lc) continue;

    const hasParens = row.city.includes("(");
    const { regionLabel, districts } = parseCityField(row.city);

    if (districts.length > 0) {
      parsedAnyDistrictList = true;
      for (const district of districts) {
        addToLookup(districtToLc, district, row.lc);
      }
      // Also register the region label itself, so a company City value that
      // exactly matches the region name (and not a specific district) still
      // resolves via the city fallback.
      if (regionLabel) addToLookup(cityToLc, regionLabel, row.lc);
    } else {
      if (hasParens) {
        // Had "(" but nothing parsable came out of it — likely malformed.
        malformedRows.push(row.city);
      }
      // Plain city/region row with no district breakdown (legacy format).
      if (regionLabel) addToLookup(cityToLc, regionLabel, row.lc);
    }

    // Legacy explicit District column, if present alongside the new format.
    if (row.district) {
      addToLookup(districtToLc, row.district, row.lc);
    }
  }

  return { districtToLc, cityToLc, parsedAnyDistrictList, malformedRows };
}

// ============================================================================
// MATCHING A COMPANY'S CITY FIELD AGAINST THE LOOKUP MAPS
// ============================================================================

interface MatchResult {
  status: AssignmentStatus;
  assignedLc: string | null;
  matchSource: MatchSource;
  matchedLabel: string | null;
  candidateLcs: string[];
  /** Whether the match came from the *whole* normalized value vs. just one word/token within it. */
  isWholeStringMatch: boolean;
}

function lookupCandidates(
  city: string,
  map: Map<string, LookupEntry>
): { lcs: Set<string>; label: string | null; wholeMatch: boolean } {
  const wholeKey = toLocationKey(city);
  const tokens = locationKeyTokens(wholeKey);

  const lcs = new Set<string>();
  let label: string | null = null;
  let wholeMatch = false;

  // Try the full value first (handles single-word cities and exact region
  // labels, and lets us know the match was "exact" for confidence scoring).
  const wholeEntry = map.get(wholeKey);
  if (wholeEntry) {
    wholeEntry.lcs.forEach((lc) => lcs.add(lc));
    label = wholeEntry.label;
    wholeMatch = true;
  }

  // Then fall back to individual words (handles "City District").
  for (const token of tokens) {
    if (token === wholeKey) continue; // already checked above
    const entry = map.get(token);
    if (entry) {
      entry.lcs.forEach((lc) => lcs.add(lc));
      if (!label) label = entry.label;
    }
  }

  return { lcs, label, wholeMatch };
}

/**
 * Deterministic matcher. Never guesses, never uses fuzzy/AI matching.
 *
 * Priority order:
 *  1. DISTRICT FIRST — extract the district from the company's City value
 *     (e.g. "Istanbul Kadıköy" -> "Kadıköy") and look it up directly in the
 *     district-to-LC map built from the mapping sheet's parenthetical
 *     district lists.
 *     - 1 distinct LC -> Assigned
 *     - 2+ distinct LC (sheet lists the same district under two regions) -> Manual Review Required
 *  2. CITY FALLBACK — if no district token resolved, the location is treated
 *     as "city name only" and matched directly against city/region names.
 *     - 1 distinct LC -> Assigned
 *     - 2+ distinct LC -> Manual Review Required
 *     - 0 matches -> Manual Review Required (a human needs to map this city)
 *  3. EMPTY INPUT — a blank City value has nothing to even review -> Unmatched.
 */
export function matchCompanyToLc(city: string, maps: LcLookupMaps): MatchResult {
  if (!normalizeForMatch(city)) {
    return {
      status: "Unmatched",
      assignedLc: null,
      matchSource: null,
      matchedLabel: null,
      candidateLcs: [],
      isWholeStringMatch: false,
    };
  }

  const districtMatch = lookupCandidates(city, maps.districtToLc);
  if (districtMatch.lcs.size > 0) {
    const distinct = Array.from(districtMatch.lcs);
    return {
      status: distinct.length === 1 ? "Assigned" : "Manual Review Required",
      assignedLc: distinct.length === 1 ? distinct[0] : null,
      matchSource: "District",
      matchedLabel: districtMatch.label,
      candidateLcs: distinct,
      isWholeStringMatch: districtMatch.wholeMatch,
    };
  }

  const cityMatch = lookupCandidates(city, maps.cityToLc);
  if (cityMatch.lcs.size > 0) {
    const distinct = Array.from(cityMatch.lcs);
    return {
      status: distinct.length === 1 ? "Assigned" : "Manual Review Required",
      assignedLc: distinct.length === 1 ? distinct[0] : null,
      matchSource: "City",
      matchedLabel: cityMatch.label,
      candidateLcs: distinct,
      isWholeStringMatch: cityMatch.wholeMatch,
    };
  }

  // Non-empty City value, but neither a district nor a city/region name we
  // recognize — per spec, this needs a human, not an auto-"Unmatched".
  return {
    status: "Manual Review Required",
    assignedLc: null,
    matchSource: null,
    matchedLabel: null,
    candidateLcs: [],
    isWholeStringMatch: false,
  };
}

// ============================================================================
// CONFIDENCE SCORE (0–100)
// ============================================================================
//
// The deterministic matcher above never does fuzzy/substring guessing, so
// "Partial match" below is reinterpreted concretely as "ambiguous — multiple
// equally-valid candidate LCs were found" rather than a fuzzy text match,
// which keeps the whole engine guess-free while still honoring the spec's
// four confidence tiers:
//
//   100    Exact match  — the company's full City value, as one whole
//          string, exactly equals a known district or city/region name.
//   85–95  District match — a district was identified, but only as one
//          word/token *within* a longer City value (e.g. "Istanbul Kadıköy").
//          95 a city was also present, 90 if no city was present.
//   60–80  Partial match — Manual Review Required: either several candidate
//          LCs matched (ambiguous) or the value just isn't recognized.
//   0      No match — the City field was empty (Unmatched).
function computeConfidenceScore(result: MatchResult): number {
  if (result.status === "Unmatched") return 0;

  if (result.status === "Manual Review Required") {
    // Ambiguous-but-recognized (multiple candidates) scores a bit higher
    // than fully unrecognized, within the 60–80 "Partial match" band.
    return result.candidateLcs.length > 0 ? 75 : 60;
  }

  // Assigned:
  if (result.isWholeStringMatch) return 100;
  if (result.matchSource === "District") return 90;
  return 80; // City matched via a sub-token of a longer value
}

// ============================================================================
// DUPLICATE COMPANY NAME DETECTION
// ============================================================================

/**
 * Normalizes a company name into a key used to group probable duplicates:
 * lower-cases (Turkish-aware), strips common legal-entity suffix words
 * (A.Ş., Ltd., Şti., Inc., Co., etc.), strips punctuation, and collapses
 * whitespace. This intentionally only *flags* candidates — records are
 * never auto-merged.
 */
const LEGAL_SUFFIX_WORDS = new Set([
  "aş",
  "ltd",
  "şti",
  "sti",
  "inc",
  "co",
  "corp",
  "san",
  "tic",
  "sanayi",
  "ticaret",
  "holding",
  "group",
  "grup",
]);

export function duplicateKeyFor(companyName: string): string {
  const normalized = normalizeForMatch(companyName);

  // Drop periods first so abbreviations like "A.Ş." collapse into a single
  // token ("aş") rather than splitting into orphan single letters once
  // punctuation is turned into whitespace below.
  const noPeriods = normalized.replace(/\./g, "");

  // Any remaining punctuation (commas, parentheses, etc.) becomes a space.
  const cleaned = noPeriods.replace(/[^a-z0-9çğıöşü\s]/gi, " ");

  const words = cleaned.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((word) => !LEGAL_SUFFIX_WORDS.has(word));

  return meaningfulWords.join(" ").trim();
}

// ============================================================================
// FULL PIPELINE: SHEET ROWS -> ENRICHED AssignedCompany[]
// ============================================================================

export interface ProcessSheetsParams {
  companies: CompanyRow[];
  mapping: LcMappingRow[];
}

export interface ProcessSheetsResult {
  companies: AssignedCompany[];
  lookupMaps: LcLookupMaps;
}

export function processCompanies({ companies, mapping }: ProcessSheetsParams): ProcessSheetsResult {
  // Built once per refresh, then reused for every company below (O(1) lookups).
  const lookupMaps = buildLcLookupMaps(mapping);

  // First pass: compute duplicate group sizes.
  const groupCounts = new Map<string, number>();
  const dupKeys = companies.map((c) => duplicateKeyFor(c.companyName));
  for (const key of dupKeys) {
    if (!key) continue;
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }

  const assigned: AssignedCompany[] = companies.map((company, idx) => {
    const matchResult = matchCompanyToLc(company.headquarters, lookupMaps);
    const duplicateGroupKey = dupKeys[idx];
    const isPossibleDuplicate = Boolean(duplicateGroupKey) && (groupCounts.get(duplicateGroupKey) ?? 0) > 1;

    const { sector, source: sectorSource } = resolveSector(company.companyName, company.sectorRaw);

    // Confidence: respect an existing numeric value already in the sheet
    // (0–100), otherwise compute it from the match quality.
    const sheetConfidence = Number(company.confidenceScoreRaw);
    const hasValidSheetConfidence =
      company.confidenceScoreRaw.trim() !== "" &&
      Number.isFinite(sheetConfidence) &&
      sheetConfidence >= 0 &&
      sheetConfidence <= 100;

    const confidenceScore = hasValidSheetConfidence
      ? Math.round(sheetConfidence)
      : computeConfidenceScore(matchResult);

    return {
      id: `${idx}-${duplicateGroupKey || "row"}`,
      companyName: company.companyName,
      headquarters: company.headquarters,

      assignedLc: matchResult.assignedLc,
      status: matchResult.status,
      matchSource: matchResult.matchSource,
      matchedLabel: matchResult.matchedLabel,
      candidateLcs: matchResult.candidateLcs,

      isPossibleDuplicate,
      duplicateGroupKey,

      sector,
      sectorSource,

      crmStatus: resolveStatus(company.statusRaw),
      notes: company.notes,
      lastUpdated: company.lastUpdatedRaw.trim() || null,

      confidenceScore,
      confidenceSource: hasValidSheetConfidence ? "sheet" : "computed",

      rowNumber: company.rowNumber,
    };
  });

  return { companies: assigned, lookupMaps };
}
