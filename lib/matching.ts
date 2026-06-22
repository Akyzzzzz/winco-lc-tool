import { AssignedCompany, AssignmentStatus, CompanyRow, LcMappingRow, MatchSource } from "@/types";
import { normalizeForMatch } from "./utils";

interface MatchResult {
  status: AssignmentStatus;
  assignedLc: string | null;
  matchSource: MatchSource;
  candidateLcs: string[];
}

/**
 * Deterministic matcher. Never guesses, never uses fuzzy/AI matching.
 *
 * Rule (in priority order):
 *  1. Look for exact (normalized) matches of the company's Headquarters
 *     against the District column. District is the more specific field,
 *     so a match there is preferred when present.
 *  2. If no District match exists, fall back to exact matches against the
 *     City column. This lets a company whose HQ is recorded only at the
 *     city level resolve correctly when that city maps to a single LC,
 *     and correctly fall into "Manual Review Required" when the city is
 *     split across multiple LCs (e.g. Istanbul).
 *  3. Zero candidate LCs after both steps -> "Unmatched".
 *  4. Exactly one distinct candidate LC -> "Assigned".
 *  5. More than one distinct candidate LC -> "Manual Review Required".
 */
export function matchCompanyToLc(
  headquarters: string,
  mapping: LcMappingRow[]
): MatchResult {
  const normalizedHq = normalizeForMatch(headquarters);

  if (!normalizedHq) {
    return { status: "Unmatched", assignedLc: null, matchSource: null, candidateLcs: [] };
  }

  const districtMatches = mapping.filter(
    (row) => normalizeForMatch(row.district) === normalizedHq
  );

  let source: MatchSource = "District";
  let matches = districtMatches;

  if (matches.length === 0) {
    const cityMatches = mapping.filter((row) => normalizeForMatch(row.city) === normalizedHq);
    matches = cityMatches;
    source = "City";
  }

  if (matches.length === 0) {
    return { status: "Unmatched", assignedLc: null, matchSource: null, candidateLcs: [] };
  }

  const distinctLcs = Array.from(new Set(matches.map((m) => m.lc.trim()).filter(Boolean)));

  if (distinctLcs.length === 1) {
    return {
      status: "Assigned",
      assignedLc: distinctLcs[0],
      matchSource: source,
      candidateLcs: distinctLcs,
    };
  }

  return {
    status: "Manual Review Required",
    assignedLc: null,
    matchSource: source,
    candidateLcs: distinctLcs,
  };
}

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

export interface ProcessSheetsParams {
  companies: CompanyRow[];
  mapping: LcMappingRow[];
}

export function processCompanies({ companies, mapping }: ProcessSheetsParams): AssignedCompany[] {
  // First pass: compute duplicate group sizes.
  const groupCounts = new Map<string, number>();
  const keys = companies.map((c) => duplicateKeyFor(c.companyName));
  for (const key of keys) {
    if (!key) continue;
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }

  return companies.map((company, idx) => {
    const result = matchCompanyToLc(company.headquarters, mapping);
    const duplicateGroupKey = keys[idx];
    const isPossibleDuplicate = Boolean(duplicateGroupKey) && (groupCounts.get(duplicateGroupKey) ?? 0) > 1;

    return {
      id: `${idx}-${duplicateGroupKey || "row"}`,
      companyName: company.companyName,
      headquarters: company.headquarters,
      assignedLc: result.assignedLc,
      status: result.status,
      matchSource: result.matchSource,
      candidateLcs: result.candidateLcs,
      isPossibleDuplicate,
      duplicateGroupKey,
    };
  });
}
