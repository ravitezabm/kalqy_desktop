import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardRepository } from "../services";
import type { DashboardData } from "../types/dashboard";

export type DashboardStatus = "loading" | "ready" | "error";

export function useDashboard(profileId: string | null) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!profileId) return;

    const requestId = ++requestIdRef.current;
    setStatus("loading");

    try {
      const result = await dashboardRepository.getDashboard(profileId);
      // Ignore responses from a superseded request (profile switch / retry).
      if (requestId !== requestIdRef.current) return;
      setData(result);
      setStatus("ready");
    } catch {
      if (requestId !== requestIdRef.current) return;
      setStatus("error");
    }
  }, [profileId]);

  useEffect(() => {
    load();
    return () => {
      // Invalidate in-flight requests on unmount.
      requestIdRef.current++;
    };
  }, [load]);

  return { data, status, retry: load };
}
