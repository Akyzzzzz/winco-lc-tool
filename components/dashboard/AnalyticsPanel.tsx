import { Flame, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PipelineAnalytics } from "@/types";

interface AnalyticsPanelProps {
  analytics: PipelineAnalytics | null;
  isLoading: boolean;
}

function HotLeadsCard({ hotLeads, isLoading }: { hotLeads: PipelineAnalytics["hotLeads"]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hot Leads</CardTitle>
        <Flame className="h-4 w-4 text-pipeline-orange" />
      </CardHeader>
      <CardContent>
        <p className="mb-2 text-[12px] text-muted">Mail sent, no progress in 5+ days</p>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : hotLeads.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">No stale leads — nice work.</p>
        ) : (
          <ul className="flex max-h-[160px] flex-col gap-1.5 overflow-auto">
            {hotLeads.slice(0, 8).map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate text-ink">{lead.companyName}</span>
                <span className="shrink-0 rounded-md bg-pipeline-orange-soft px-1.5 py-0.5 text-[11px] font-medium text-pipeline-orange">
                  {lead.daysSinceUpdate}d
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ConversionRatesCard({
  conversionRates,
  isLoading,
}: {
  conversionRates: PipelineAnalytics["conversionRates"];
  isLoading: boolean;
}) {
  const rows = [
    { label: "Mail Sent → In Contact", value: conversionRates.mailSentToContact },
    { label: "In Contact → Approved", value: conversionRates.contactToApproved },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Rates</CardTitle>
        <TrendingUp className="h-4 w-4 text-success" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-muted">{row.label}</span>
              {isLoading ? (
                <Skeleton className="h-4 w-10" />
              ) : (
                <span className="font-display font-semibold text-ink">{row.value}%</span>
              )}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{ width: isLoading ? 0 : `${row.value}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted">
          Approximated from current status snapshot (no historical change log).
        </p>
      </CardContent>
    </Card>
  );
}

function LcHealthCard({
  lcHealthScores,
  isLoading,
}: {
  lcHealthScores: PipelineAnalytics["lcHealthScores"];
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Health by LC</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : lcHealthScores.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted">No assigned companies yet.</p>
        ) : (
          <ul className="flex max-h-[180px] flex-col gap-2.5 overflow-auto">
            {lcHealthScores.map((h) => (
              <li key={h.lc} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[13px] text-ink">{h.lc}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      h.healthScore >= 60 ? "bg-success" : h.healthScore >= 30 ? "bg-warning" : "bg-danger"
                    )}
                    style={{ width: `${h.healthScore}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-muted">
                  {h.healthScore} · {h.companyCount}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function AnalyticsPanel({ analytics, isLoading }: AnalyticsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <HotLeadsCard hotLeads={analytics?.hotLeads ?? []} isLoading={isLoading} />
      <ConversionRatesCard
        conversionRates={analytics?.conversionRates ?? { mailSentToContact: 0, contactToApproved: 0 }}
        isLoading={isLoading}
      />
      <LcHealthCard lcHealthScores={analytics?.lcHealthScores ?? []} isLoading={isLoading} />
    </div>
  );
}
