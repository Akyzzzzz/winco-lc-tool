"use client";

import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignedCompany } from "@/types";
import { exportToCsv, exportToXlsx } from "@/lib/export";

interface ExportMenuProps {
  companies: AssignedCompany[];
}

export function ExportMenu({ companies }: ExportMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="md"
        onClick={() => exportToCsv(companies)}
        disabled={companies.length === 0}
        title="Export the currently displayed rows as CSV"
      >
        <FileText className="h-3.5 w-3.5" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="md"
        onClick={() => exportToXlsx(companies)}
        disabled={companies.length === 0}
        title="Export the currently displayed rows as Excel"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Export Excel
      </Button>
    </div>
  );
}
