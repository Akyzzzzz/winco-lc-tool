// ============================================================================
// WINCO LC ASSIGNMENT TOOL — SHARED TYPES
// ============================================================================

/** A single row from the LC Mapping sheet (City | Assignment). Logic unchanged. */
export interface LcMappingRow {
  city: string;
  /** Legacy optional column — some rows may still use a separate District column. */
  district: string;
  lc: string;
}

// ----------------------------------------------------------------------------
// SECTOR — AI (rule-based) classification
// ----------------------------------------------------------------------------

export const SECTOR_VALUES = [
  "Food",
  "Beverage",
  "Cosmetics",
  "Textile",
  "Pet",
  "Tech",
  "Logistics",
  "Retail",
  "Other",
] as const;

export type SectorValue = (typeof SECTOR_VALUES)[number];

// ----------------------------------------------------------------------------
// CRM STATUS PIPELINE — controlled state machine
// ----------------------------------------------------------------------------

export const STATUS_VALUES = [
  "EMPTY",
  "MAIL_TO_SEND",
  "MAIL_SENT",
  "IN_CONTACT",
  "MEETING_SCHEDULED",
  "APPROVED",
  "REJECTED",
  "ON_HOLD",
] as const;

export type StatusValue = (typeof STATUS_VALUES)[number];

// ----------------------------------------------------------------------------
// RAW SHEET ROWS
// ----------------------------------------------------------------------------

/**
 * A single row from the Company sheet, columns A–G:
 * Name | City | Sector | Status | Last Updated | Notes | Confidence Score
 * Sector/Status/Last Updated/Confidence may be blank — they get computed by
 * the pipeline and (when a write-back is configured) persisted back to the
 * sheet.
 */
export interface CompanyRow {
  companyName: string;
  headquarters: string;
  sectorRaw: string;
  statusRaw: string;
  lastUpdatedRaw: string;
  notes: string;
  confidenceScoreRaw: string;
  /** 1-based row number in the actual Google Sheet (header = row 1), used for write-back ranges. */
  rowNumber: number;
}

export type AssignmentStatus = "Assigned" | "Unmatched" | "Manual Review Required";

/** Which column the deterministic LC match was found on. */
export type MatchSource = "District" | "City" | null;

/** A fully processed company record, after running the matching + enrichment pipeline. */
export interface AssignedCompany {
  id: string;
  companyName: string;
  /** Raw City value from the sheet (kept as "headquarters" for backward compatibility). */
  headquarters: string;

  // ---- LC routing (unchanged logic) ----
  assignedLc: string | null;
  status: AssignmentStatus;
  matchSource: MatchSource;
  matchedLabel: string | null;
  candidateLcs: string[];

  // ---- Duplicate detection (unchanged) ----
  isPossibleDuplicate: boolean;
  duplicateGroupKey: string;

  // ---- Sector AI classification ----
  sector: SectorValue;
  sectorSource: "sheet" | "ai";

  // ---- CRM pipeline ----
  crmStatus: StatusValue;
  notes: string;
  lastUpdated: string | null;

  // ---- Confidence score (0-100) ----
  confidenceScore: number;
  confidenceSource: "sheet" | "computed";

  /** 1-based row number in the Google Sheet, used when persisting status edits. */
  rowNumber: number;
}

// ----------------------------------------------------------------------------
// ANALYTICS
// ----------------------------------------------------------------------------

export interface LcHealthScore {
  lc: string;
  companyCount: number;
  /** 0-100 weighted pipeline-progress score for this LC's companies. */
  healthScore: number;
}

export interface ConversionRates {
  /** % of companies that ever reached MAIL_SENT which are now IN_CONTACT or further. */
  mailSentToContact: number;
  /** % of companies that ever reached IN_CONTACT which are now APPROVED. */
  contactToApproved: number;
}

export interface PipelineAnalytics {
  statusDistribution: Record<StatusValue, number>;
  sectorDistribution: Record<SectorValue, number>;
  /** Companies stuck at MAIL_SENT for longer than the hot-lead threshold. */
  hotLeads: { id: string; companyName: string; daysSinceUpdate: number }[];
  conversionRates: ConversionRates;
  lcHealthScores: LcHealthScore[];
}

export interface DashboardStats {
  totalCompanies: number;
  assignedCompanies: number;
  unmatchedCompanies: number;
  manualReviewCompanies: number;
  totalLcs: number;
  possibleDuplicateCount: number;
}

export interface CacheInfo {
  cachedAt: string;
  ttlMs: number;
  isFresh: boolean;
  ageMs: number;
}

export interface SheetDataResponse {
  companies: AssignedCompany[];
  stats: DashboardStats;
  analytics: PipelineAnalytics;
  lcList: string[];
  headquartersList: string[];
  fetchedAt: string;
  warnings: string[];
  cache: CacheInfo;
  /** True if a Google Sheets service account is configured, enabling real persistence of status edits. */
  writeBackEnabled: boolean;
}

export interface SheetDataError {
  error: string;
  detail?: string;
}

// ----------------------------------------------------------------------------
// STATUS UPDATE API
// ----------------------------------------------------------------------------

export interface UpdateCompanyStatusRequest {
  rowNumber: number;
  crmStatus: StatusValue;
  notes?: string;
}

export interface UpdateCompanyStatusResponse {
  success: boolean;
  persisted: boolean;
  lastUpdated: string;
  message?: string;
}
