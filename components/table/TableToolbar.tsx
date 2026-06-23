"use client";

import { Search, Copy, CircleSlash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AssignmentStatus, SECTOR_VALUES, SectorValue, STATUS_VALUES, StatusValue } from "@/types";
import { STATUS_CONFIG } from "@/lib/status";

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AssignmentStatus | "all";
  onStatusFilterChange: (value: AssignmentStatus | "all") => void;
  lcFilter: string;
  onLcFilterChange: (value: string) => void;
  hqFilter: string;
  onHqFilterChange: (value: string) => void;
  sectorFilter: SectorValue | "all";
  onSectorFilterChange: (value: SectorValue | "all") => void;
  crmStatusFilter: StatusValue | "all";
  onCrmStatusFilterChange: (value: StatusValue | "all") => void;
  unmatchedOnly: boolean;
  onUnmatchedOnlyChange: (value: boolean) => void;
  duplicatesOnly: boolean;
  onDuplicatesOnlyChange: (value: boolean) => void;
  lcList: string[];
  headquartersList: string[];
  resultCount: number;
}

export function TableToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  lcFilter,
  onLcFilterChange,
  hqFilter,
  onHqFilterChange,
  sectorFilter,
  onSectorFilterChange,
  crmStatusFilter,
  onCrmStatusFilterChange,
  unmatchedOnly,
  onUnmatchedOnlyChange,
  duplicatesOnly,
  onDuplicatesOnlyChange,
  lcList,
  headquartersList,
  resultCount,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company or city…"
            className="pl-8"
          />
        </div>
        <span className="shrink-0 text-[13px] text-muted">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as AssignmentStatus | "all")}
          className="w-auto min-w-[150px]"
          aria-label="Filter by LC match status"
        >
          <option value="all">All match statuses</option>
          <option value="Assigned">Assigned</option>
          <option value="Unmatched">Unmatched</option>
          <option value="Manual Review Required">Manual Review</option>
        </Select>

        <Select
          value={lcFilter}
          onChange={(e) => onLcFilterChange(e.target.value)}
          className="w-auto min-w-[140px]"
          aria-label="Filter by LC"
        >
          <option value="all">All LCs</option>
          {lcList.map((lc) => (
            <option key={lc} value={lc}>
              {lc}
            </option>
          ))}
        </Select>

        <Select
          value={hqFilter}
          onChange={(e) => onHqFilterChange(e.target.value)}
          className="w-auto min-w-[150px]"
          aria-label="Filter by city"
        >
          <option value="all">All cities</option>
          {headquartersList.map((hq) => (
            <option key={hq} value={hq}>
              {hq}
            </option>
          ))}
        </Select>

        <Select
          value={sectorFilter}
          onChange={(e) => onSectorFilterChange(e.target.value as SectorValue | "all")}
          className="w-auto min-w-[130px]"
          aria-label="Filter by sector"
        >
          <option value="all">All sectors</option>
          {SECTOR_VALUES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          value={crmStatusFilter}
          onChange={(e) => onCrmStatusFilterChange(e.target.value as StatusValue | "all")}
          className="w-auto min-w-[150px]"
          aria-label="Filter by CRM status"
        >
          <option value="all">All CRM statuses</option>
          {STATUS_VALUES.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </Select>

        <Button
          variant={unmatchedOnly ? "secondary" : "outline"}
          size="md"
          onClick={() => onUnmatchedOnlyChange(!unmatchedOnly)}
        >
          <CircleSlash className="h-3.5 w-3.5" />
          Unmatched only
        </Button>

        <Button
          variant={duplicatesOnly ? "secondary" : "outline"}
          size="md"
          onClick={() => onDuplicatesOnlyChange(!duplicatesOnly)}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicates only
        </Button>
      </div>
    </div>
  );
}
