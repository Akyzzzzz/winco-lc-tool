"use client";

import { useState } from "react";
import { AlertOctagon, Info } from "lucide-react";
import { Header } from "@/components/Header";
import { RefreshButton } from "@/components/RefreshButton";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { StatusDistributionChart } from "@/components/dashboard/StatusDistributionChart";
import { SectorDistributionCard } from "@/components/dashboard/SectorDistributionCard";
import { AnalyticsPanel } from "@/components/dashboard/AnalyticsPanel";
import { DuplicateBanner } from "@/components/DuplicateBanner";
import { CompanyTable } from "@/components/table/CompanyTable";
import { useLcAssignmentData } from "@/hooks/useLcAssignmentData";
import { AssignmentStatus } from "@/types";

export default function Page() {
  const { data, isLoading, isRefreshing, error, refresh, updateCompany } = useLcAssignmentData();
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | "all">("all");
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);

  function handleSummaryFilterClick(filter: string | null) {
    if (filter === null) {
      setStatusFilter("all");
      return;
    }
    setStatusFilter(filter as AssignmentStatus);
  }

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Header />
        <RefreshButton onRefresh={refresh} isRefreshing={isRefreshing} fetchedAt={data?.fetchedAt} cache={data?.cache} />
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Couldn't load sheet data</p>
            <p className="text-danger/90">{error}</p>
          </div>
        </div>
      )}

      {data && !data.writeBackEnabled && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-canvas px-4 py-3 text-sm text-muted">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            CRM status/notes edits aren't saving to the Google Sheet — no service account is configured. See
            DEPLOYMENT.md to enable write-back.
          </span>
        </div>
      )}

      {data && data.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
          {data.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <SummaryCards
        stats={data?.stats ?? null}
        isLoading={isLoading}
        activeFilter={statusFilter === "all" ? null : statusFilter}
        onFilterClick={handleSummaryFilterClick}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StatusDistributionChart distribution={data?.analytics.statusDistribution ?? null} isLoading={isLoading} />
        <SectorDistributionCard distribution={data?.analytics.sectorDistribution ?? null} isLoading={isLoading} />
      </div>

      <AnalyticsPanel analytics={data?.analytics ?? null} isLoading={isLoading} />

      {data && (
        <DuplicateBanner
          count={data.stats.possibleDuplicateCount}
          onShowDuplicates={() => setDuplicatesOnly(true)}
        />
      )}

      <CompanyTable
        companies={data?.companies ?? []}
        lcList={data?.lcList ?? []}
        headquartersList={data?.headquartersList ?? []}
        isLoading={isLoading}
        writeBackEnabled={data?.writeBackEnabled ?? false}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        duplicatesOnly={duplicatesOnly}
        onDuplicatesOnlyChange={setDuplicatesOnly}
        onCompanyUpdate={updateCompany}
      />
    </main>
  );
}
