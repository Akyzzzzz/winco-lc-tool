"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SheetDataResponse } from "@/types";

interface UseLcAssignmentDataState {
  data: SheetDataResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useLcAssignmentData(): UseLcAssignmentDataState {
  const [data, setData] = useState<SheetDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (hasLoadedOnce.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/sheet-data", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Failed to load sheet data.");
      }

      setData(json as SheetDataResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while loading data.");
    } finally {
      hasLoadedOnce.current = true;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading, isRefreshing, error, refresh: load };
}
