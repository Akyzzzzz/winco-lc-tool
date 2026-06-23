"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileSpreadsheet, FileText, MapPinned, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignedCompany } from "@/types";
import { exportLcReport, exportSectorReport, exportToCsv, exportToXlsx } from "@/lib/export";

interface ExportMenuProps {
  /** Currently filtered/displayed companies — exported as-is for the main exports. */
  companies: AssignedCompany[];
  /** Full unfiltered dataset — used for the LC/Sector reports, which should reflect everything, not just the current filter. */
  allCompanies: AssignedCompany[];
}

export function ExportMenu({ companies, allCompanies }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const disabled = companies.length === 0;

  function runAndClose(action: () => void) {
    action();
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button variant="outline" size="md" onClick={() => setIsOpen((v) => !v)} disabled={disabled}>
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Export Report
        <ChevronDown className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 z-20 mt-1.5 w-64 animate-fade-in overflow-hidden rounded-xl border border-border bg-surface shadow-popover">
          <div className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            Filtered data ({companies.length})
          </div>
          <MenuItem icon={FileText} label="Export as CSV" onClick={() => runAndClose(() => exportToCsv(companies))} />
          <MenuItem
            icon={FileSpreadsheet}
            label="Export as Excel"
            onClick={() => runAndClose(() => exportToXlsx(companies))}
          />
          <div className="border-b border-t border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted">
            Full dataset reports
          </div>
          <MenuItem
            icon={MapPinned}
            label="LC Assignment Report"
            onClick={() => runAndClose(() => exportLcReport(allCompanies))}
          />
          <MenuItem
            icon={PieChart}
            label="Sector Breakdown Report"
            onClick={() => runAndClose(() => exportSectorReport(allCompanies))}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-ink hover:bg-canvas"
    >
      <Icon className="h-3.5 w-3.5 text-muted" />
      {label}
    </button>
  );
}
