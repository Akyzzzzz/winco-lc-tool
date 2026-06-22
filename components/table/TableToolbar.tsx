"use client";

import { Search, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AssignmentStatus } from "@/types";

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AssignmentStatus | "all";
  onStatusFilterChange: (value: AssignmentStatus | "all") => void;
  lcFilter: string;
  onLcFilterChange: (value: string) => void;
  hqFilter: string;
  onHqFilterChange: (value: string) => void;
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
  duplicatesOnly,
  onDuplicatesOnlyChange,
  lcList,
  headquartersList,
  resultCount,
}: TableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search company or headquarters…"
            className="pl-8"
          />
        </div>

        <Select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as AssignmentStatus | "all")}
          className="w-full sm:w-44"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="Assigned">Assigned</option>
          <option value="Unmatched">Unmatched</option>
          <option value="Manual Review Required">Manual Review</option>
        </Select>

        <Select
          value={lcFilter}
          onChange={(e) => onLcFilterChange(e.target.value)}
          className="w-full sm:w-44"
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
          className="w-full sm:w-48"
          aria-label="Filter by headquarters"
        >
          <option value="all">All headquarters</option>
          {headquartersList.map((hq) => (
            <option key={hq} value={hq}>
              {hq}
            </option>
          ))}
        </Select>

        <Button
          variant={duplicatesOnly ? "secondary" : "outline"}
          size="md"
          onClick={() => onDuplicatesOnlyChange(!duplicatesOnly)}
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicates only
        </Button>
      </div>

      <span className="shrink-0 text-[13px] text-muted">
        {resultCount} result{resultCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}
