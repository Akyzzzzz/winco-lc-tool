// ============================================================================
// WINCO LC ASSIGNMENT TOOL — SHARED TYPES
// ============================================================================

/** A single row from the LC Mapping sheet. */
export interface LcMappingRow {
  city: string;
  district: string;
  lc: string;
}

/** A single row from the Company Database sheet. */
export interface CompanyRow {
  companyName: string;
  headquarters: string;
}

export type AssignmentStatus = "Assigned" | "Unmatched" | "Manual Review Required";

/** Which column the deterministic match was found on. */
export type MatchSource = "District" | "City" | null;

/** A fully processed company record, after running the matching engine. */
export interface AssignedCompany {
  id: string;
  companyName: string;
  headquarters: string;
  assignedLc: string | null;
  status: AssignmentStatus;
  matchSource: MatchSource;
  /** All candidate LCs found — length > 1 only when status is "Manual Review Required". */
  candidateLcs: string[];
  /** True if this company name looks like a duplicate of another row. */
  isPossibleDuplicate: boolean;
  /** Normalized key used to group possible duplicates together. */
  duplicateGroupKey: string;
}

export interface DashboardStats {
  totalCompanies: number;
  assignedCompanies: number;
  unmatchedCompanies: number;
  manualReviewCompanies: number;
  totalLcs: number;
  possibleDuplicateCount: number;
}

export interface SheetDataResponse {
  companies: AssignedCompany[];
  stats: DashboardStats;
  lcList: string[];
  headquartersList: string[];
  fetchedAt: string;
  warnings: string[];
}

export interface SheetDataError {
  error: string;
  detail?: string;
}
