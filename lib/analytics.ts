import {
  AssignedCompany,
  ConversionRates,
  LcHealthScore,
  PipelineAnalytics,
  SECTOR_VALUES,
  STATUS_VALUES,
  SectorValue,
  StatusValue,
} from "@/types";

// How many days a company can sit at MAIL_SENT before it's flagged as a
// "hot lead" needing follow-up. Kept local to this module (rather than in
// lib/config.ts) because lib/analytics.ts is also imported by client-side
// export code (lib/export.ts) — it must stay free of any server-secret
// dependencies so it's safe to bundle into the browser.
const HOT_LEAD_STALE_DAYS = 5;

function emptyStatusDistribution(): Record<StatusValue, number> {
  return STATUS_VALUES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<StatusValue, number>);
}

function emptySectorDistribution(): Record<SectorValue, number> {
  return SECTOR_VALUES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<SectorValue, number>);
}

/**
 * "Hot leads" = companies sitting at MAIL_SENT with no recorded progress
 * (Last Updated) for longer than HOT_LEAD_STALE_DAYS. There's no event log
 * of status-change history in the sheet, so "no response" is approximated
 * as "still MAIL_SENT, and it's been a while since Last Updated" — the
 * closest signal available without adding a separate activity log.
 */
function computeHotLeads(companies: AssignedCompany[]) {
  const now = Date.now();

  return companies
    .filter((c) => c.crmStatus === "MAIL_SENT" && c.lastUpdated)
    .map((c) => {
      const updatedAt = new Date(c.lastUpdated as string).getTime();
      const daysSinceUpdate = Number.isFinite(updatedAt)
        ? Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24))
        : 0;
      return { id: c.id, companyName: c.companyName, daysSinceUpdate };
    })
    .filter((c) => c.daysSinceUpdate >= HOT_LEAD_STALE_DAYS)
    .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
}

/**
 * Funnel-style conversion rates computed from the *current* status snapshot
 * (the sheet has no historical transition log, so this approximates "ever
 * reached stage X" as "currently at stage X or further along the funnel,
 * including REJECTED/ON_HOLD which imply the prior stage was reached").
 */
function computeConversionRates(companies: AssignedCompany[]): ConversionRates {
  const reachedMailSent = companies.filter((c) =>
    (["MAIL_SENT", "IN_CONTACT", "MEETING_SCHEDULED", "APPROVED", "REJECTED", "ON_HOLD"] as StatusValue[]).includes(
      c.crmStatus
    )
  ).length;

  const reachedInContact = companies.filter((c) =>
    (["IN_CONTACT", "MEETING_SCHEDULED", "APPROVED", "REJECTED", "ON_HOLD"] as StatusValue[]).includes(c.crmStatus)
  ).length;

  const reachedApproved = companies.filter((c) => c.crmStatus === "APPROVED").length;

  const mailSentToContact = reachedMailSent === 0 ? 0 : Math.round((reachedInContact / reachedMailSent) * 100);
  const contactToApproved = reachedInContact === 0 ? 0 : Math.round((reachedApproved / reachedInContact) * 100);

  return { mailSentToContact, contactToApproved };
}

/**
 * A transparent, weighted "engagement score" per LC: further-along pipeline
 * stages count for more, normalized to 0–100 of that LC's company count.
 * This is a heuristic business-intelligence metric, not a precise KPI —
 * documented here and in the README so the weights can be tuned.
 */
const STAGE_WEIGHTS: Partial<Record<StatusValue, number>> = {
  MAIL_TO_SEND: 0.1,
  MAIL_SENT: 0.3,
  IN_CONTACT: 0.5,
  MEETING_SCHEDULED: 0.7,
  APPROVED: 1,
};

function computeLcHealthScores(companies: AssignedCompany[]): LcHealthScore[] {
  const byLc = new Map<string, AssignedCompany[]>();
  for (const c of companies) {
    if (!c.assignedLc) continue;
    const list = byLc.get(c.assignedLc) ?? [];
    list.push(c);
    byLc.set(c.assignedLc, list);
  }

  return Array.from(byLc.entries())
    .map(([lc, list]) => {
      const weightedSum = list.reduce((sum, c) => sum + (STAGE_WEIGHTS[c.crmStatus] ?? 0), 0);
      const healthScore = list.length === 0 ? 0 : Math.round((weightedSum / list.length) * 100);
      return { lc, companyCount: list.length, healthScore };
    })
    .sort((a, b) => b.healthScore - a.healthScore);
}

export function computeAnalytics(companies: AssignedCompany[]): PipelineAnalytics {
  const statusDistribution = emptyStatusDistribution();
  const sectorDistribution = emptySectorDistribution();

  for (const c of companies) {
    statusDistribution[c.crmStatus] += 1;
    sectorDistribution[c.sector] += 1;
  }

  return {
    statusDistribution,
    sectorDistribution,
    hotLeads: computeHotLeads(companies),
    conversionRates: computeConversionRates(companies),
    lcHealthScores: computeLcHealthScores(companies),
  };
}
