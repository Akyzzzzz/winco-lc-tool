"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AssignedCompany, SheetDataResponse } from "@/types";

interface UseLcAssignmentDataState {
  data: SheetDataResponse | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  /** Bypasses the server's in-memory cache and re-fetches both sheets — wired to the "Refresh Data" button. */
  refresh: () => Promise<void>;
  /** Optimistically patches one company's CRM fields in local state after a successful PATCH. */
  updateCompany: (rowNumber: number, patch: Partial<Pick<AssignedCompany, "crmStatus" | "notes" | "lastUpdated">>) => void;
}

export function useLcAssignmentData(): UseLcAssignmentDataState {
  const [data, setData] = useState<SheetDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async (forceRefresh: boolean) => {
    if (hasLoadedOnce.current) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const res = await fetch(forceRefresh ? "/api/sheet-data?refresh=1" : "/api/sheet-data", {
        cache: "no-store",
      });
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
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const updateCompany = useCallback(
    (rowNumber: number, patch: Partial<Pick<AssignedCompany, "crmStatus" | "notes" | "lastUpdated">>) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          companies: prev.companies.map((c) => (c.rowNumber === rowNumber ? { ...c, ...patch } : c)),
        };
      });
    },
    []
  );

  return { data, isLoading, isRefreshing, error, refresh, updateCompany };
}
