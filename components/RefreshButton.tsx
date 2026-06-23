"use client";

import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { CacheInfo } from "@/types";

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  fetchedAt?: string;
  cache?: CacheInfo;
}

export function RefreshButton({ onRefresh, isRefreshing, fetchedAt, cache }: RefreshButtonProps) {
  return (
    <div className="flex items-center gap-2.5">
      {fetchedAt && (
        <span className="hidden items-center gap-1.5 text-[12px] text-muted sm:inline-flex">
          {cache && !cache.isFresh && <AlertTriangle className="h-3 w-3 text-warning" />}
          Updated {formatRelativeTime(fetchedAt)}
          {cache && !cache.isFresh && <span className="text-warning">· last refresh failed</span>}
        </span>
      )}
      <Button onClick={onRefresh} disabled={isRefreshing} size="md" variant="primary">
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        {isRefreshing ? "Refreshing…" : "Refresh Data"}
      </Button>
    </div>
  );
}
