"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getAllowedNextStatuses, STATUS_CONFIG } from "@/lib/status";
import { StatusValue } from "@/types";
import { CrmStatusBadge } from "@/components/dashboard/CrmStatusBadge";
import { cn } from "@/lib/utils";

interface CrmStatusSelectProps {
  rowNumber: number;
  status: StatusValue;
  writeBackEnabled: boolean;
  onChange: (rowNumber: number, newStatus: StatusValue, persisted: boolean) => void;
}

export function CrmStatusSelect({ rowNumber, status, writeBackEnabled, onChange }: CrmStatusSelectProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedNext = getAllowedNextStatuses(status);

  async function handleChange(newStatus: StatusValue) {
    if (newStatus === status) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/companies/${rowNumber}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crmStatus: newStatus, fromStatus: status }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to update status.");
      }

      onChange(rowNumber, newStatus, Boolean(json.persisted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="relative inline-flex w-fit items-center">
        <select
          value={status}
          disabled={isSaving}
          onChange={(e) => handleChange(e.target.value as StatusValue)}
          className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-wait"
          aria-label="Change CRM status"
        >
          {allowedNext.map((s) => (
            <option key={s} value={s}>
              {STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
        <CrmStatusBadge status={status} className={cn("pointer-events-none", isSaving && "opacity-60")} />
        {isSaving && <Loader2 className="ml-1 h-3 w-3 animate-spin text-muted" />}
      </div>
      {!writeBackEnabled && <span className="text-[10px] text-muted">not saved to sheet</span>}
      {error && <span className="text-[10px] text-danger">{error}</span>}
    </div>
  );
}
