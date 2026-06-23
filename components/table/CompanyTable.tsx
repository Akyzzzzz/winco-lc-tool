"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Copy, MapPin } from "lucide-react";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CrmStatusSelect } from "@/components/CrmStatusSelect";
import { NotesCell } from "@/components/NotesCell";
import { TableToolbar } from "@/components/table/TableToolbar";
import { Pagination } from "@/components/table/Pagination";
import { ExportMenu } from "@/components/ExportMenu";
import { AssignedCompany, AssignmentStatus, SectorValue, StatusValue } from "@/types";
import { normalizeForMatch } from "@/lib/utils";

type SortColumn = "companyName" | "headquarters" | "assignedLc" | "status" | "sector" | "crmStatus" | "confidenceScore";
type SortDirection = "asc" | "desc";

interface CompanyTableProps {
  companies: AssignedCompany[];
  lcList: string[];
  headquartersList: string[];
  isLoading: boolean;
  writeBackEnabled: boolean;
  statusFilter: AssignmentStatus | "all";
  onStatusFilterChange: (value: AssignmentStatus | "all") => void;
  duplicatesOnly: boolean;
  onDuplicatesOnlyChange: (value: boolean) => void;
  onCompanyUpdate: (rowNumber: number, patch: Partial<Pick<AssignedCompany, "crmStatus" | "notes" | "lastUpdated">>) => void;
}

const SORT_LABEL: Record<SortColumn, string> = {
  companyName: "Company Name",
  headquarters: "City",
  assignedLc: "Assigned LC",
  status: "LC Status",
  sector: "Sector",
  crmStatus: "CRM Status",
  confidenceScore: "Confidence",
};

export function CompanyTable({
  companies,
  lcList,
  headquartersList,
  isLoading,
  writeBackEnabled,
  statusFilter,
  onStatusFilterChange,
  duplicatesOnly,
  onDuplicatesOnlyChange,
  onCompanyUpdate,
}: CompanyTableProps) {
  const [search, setSearch] = useState("");
  const [lcFilter, setLcFilter] = useState("all");
  const [hqFilter, setHqFilter] = useState("all");
  const [sectorFilter, setSectorFilter] = useState<SectorValue | "all">("all");
  const [crmStatusFilter, setCrmStatusFilter] = useState<StatusValue | "all">("all");
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [sortColumn, setSortColumn] = useState<SortColumn>("companyName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Reset to page 1 whenever a filter/search/sort input changes.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, lcFilter, hqFilter, sectorFilter, crmStatusFilter, unmatchedOnly, duplicatesOnly, sortColumn, sortDirection]);

  const filteredSorted = useMemo(() => {
    const normalizedSearch = normalizeForMatch(search);

    let rows = companies.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (lcFilter !== "all" && c.assignedLc !== lcFilter) return false;
      if (hqFilter !== "all" && c.headquarters !== hqFilter) return false;
      if (sectorFilter !== "all" && c.sector !== sectorFilter) return false;
      if (crmStatusFilter !== "all" && c.crmStatus !== crmStatusFilter) return false;
      if (unmatchedOnly && c.status !== "Unmatched") return false;
      if (duplicatesOnly && !c.isPossibleDuplicate) return false;
      if (normalizedSearch) {
        const haystack = normalizeForMatch(`${c.companyName} ${c.headquarters}`);
        if (!haystack.includes(normalizedSearch)) return false;
      }
      return true;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      if (sortColumn === "confidenceScore") {
        return (a.confidenceScore - b.confidenceScore) * dir;
      }
      const av = (a[sortColumn] ?? "") as string;
      const bv = (b[sortColumn] ?? "") as string;
      return av.localeCompare(bv, "tr") * dir;
    });

    return rows;
  }, [
    companies,
    search,
    statusFilter,
    lcFilter,
    hqFilter,
    sectorFilter,
    crmStatusFilter,
    unmatchedOnly,
    duplicatesOnly,
    sortColumn,
    sortDirection,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function toggleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function SortableHeader({ column }: { column: SortColumn }) {
    return (
      <button onClick={() => toggleSort(column)} className="inline-flex items-center gap-1 hover:text-ink">
        {SORT_LABEL[column]}
        {sortColumn !== column ? (
          <ArrowUpDown className="h-3 w-3 text-muted/60" />
        ) : sortDirection === "asc" ? (
          <ArrowUp className="h-3 w-3 text-accent" />
        ) : (
          <ArrowDown className="h-3 w-3 text-accent" />
        )}
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <div className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink">Companies</h2>
        <ExportMenu companies={filteredSorted} allCompanies={companies} />
      </div>

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        lcFilter={lcFilter}
        onLcFilterChange={setLcFilter}
        hqFilter={hqFilter}
        onHqFilterChange={setHqFilter}
        sectorFilter={sectorFilter}
        onSectorFilterChange={setSectorFilter}
        crmStatusFilter={crmStatusFilter}
        onCrmStatusFilterChange={setCrmStatusFilter}
        unmatchedOnly={unmatchedOnly}
        onUnmatchedOnlyChange={setUnmatchedOnly}
        duplicatesOnly={duplicatesOnly}
        onDuplicatesOnlyChange={onDuplicatesOnlyChange}
        lcList={lcList}
        headquartersList={headquartersList}
        resultCount={filteredSorted.length}
      />

      <div className="max-h-[620px] overflow-auto">
        <Table>
          <THead>
            <TR>
              <TH><SortableHeader column="companyName" /></TH>
              <TH><SortableHeader column="headquarters" /></TH>
              <TH><SortableHeader column="assignedLc" /></TH>
              <TH><SortableHeader column="status" /></TH>
              <TH><SortableHeader column="sector" /></TH>
              <TH><SortableHeader column="crmStatus" /></TH>
              <TH><SortableHeader column="confidenceScore" /></TH>
              <TH>Notes</TH>
            </TR>
          </THead>
          <TBody>
            {isLoading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TR key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TD key={j}>
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </TD>
                  ))}
                </TR>
              ))}

            {!isLoading && paginatedRows.length === 0 && (
              <TR>
                <TD colSpan={8} className="py-12 text-center text-muted">
                  No companies match the current filters.
                </TD>
              </TR>
            )}

            {!isLoading &&
              paginatedRows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink">{c.companyName}</span>
                      {c.isPossibleDuplicate && (
                        <span title="Possible duplicate company name">
                          <Copy className="h-3.5 w-3.5 text-duplicate" />
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD className="text-muted">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted/70" />
                      {c.headquarters || "—"}
                    </span>
                  </TD>
                  <TD>
                    {c.assignedLc ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-ink">{c.assignedLc}</span>
                        {c.matchSource && (
                          <span className="text-[11px] text-muted">
                            via {c.matchSource}
                            {c.matchedLabel ? `: ${c.matchedLabel}` : ""}
                          </span>
                        )}
                      </div>
                    ) : c.candidateLcs.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-[12px] text-muted">{c.candidateLcs.length} candidates:</span>
                        <div className="flex flex-wrap gap-1">
                          {c.candidateLcs.map((lc) => (
                            <Badge key={lc} tone="warning">
                              {lc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge status={c.status} />
                  </TD>
                  <TD>
                    <Badge tone="accent">{c.sector}</Badge>
                  </TD>
                  <TD>
                    <CrmStatusSelect
                      rowNumber={c.rowNumber}
                      status={c.crmStatus}
                      writeBackEnabled={writeBackEnabled}
                      onChange={(rowNumber, newStatus, persisted) =>
                        onCompanyUpdate(rowNumber, {
                          crmStatus: newStatus,
                          lastUpdated: persisted ? new Date().toISOString() : c.lastUpdated,
                        })
                      }
                    />
                  </TD>
                  <TD>
                    <span className="font-mono text-[13px] tabular-nums text-ink">{c.confidenceScore}</span>
                  </TD>
                  <TD>
                    <NotesCell
                      rowNumber={c.rowNumber}
                      notes={c.notes}
                      writeBackEnabled={writeBackEnabled}
                      onChange={(rowNumber, newNotes) => onCompanyUpdate(rowNumber, { notes: newNotes })}
                    />
                  </TD>
                </TR>
              ))}
          </TBody>
        </Table>
      </div>

      <Pagination
        page={safePage}
        pageSize={pageSize}
        totalRows={filteredSorted.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
