"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  fetchedAt?: string;
}

export function RefreshButton({ onRefresh, isRefreshing, fetchedAt }: RefreshButtonProps) {
  return (
    <div className="flex items-center gap-2.5">
      {fetchedAt && (
        <span className="hidden text-[12px] text-muted sm:inline">
          Updated {formatRelativeTime(fetchedAt)}
        </span>
      )}
      <Button onClick={onRefresh} disabled={isRefreshing} size="md" variant="primary">
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        {isRefreshing ? "Refreshing…" : "Refresh Data"}
      </Button>
    </div>
  );
}
