import { useEffect, useState } from "react";
import { API_BASE, COLD_START_TIMEOUT_MS } from "./api";

export type ApiWarmth = "checking" | "warm" | "unreachable";

/**
 * Pings /api/status on mount so the Container App has usually already started by the time a visitor reaches the contact form.
 * The result also drives a small status line, which turns an invisible cold start into visible proof the backend is real rather than a static mockup.
 */
export function useApiStatus() {
    const [warmth, setWarmth] = useState<ApiWarmth>("checking");

    useEffect(() => {
        let cancelled = false;

        fetch(`${API_BASE}/api/status`, {
            signal: AbortSignal.timeout(COLD_START_TIMEOUT_MS),
        })
            .then((res) => {
                if (!cancelled) setWarmth(res.ok ? "warm" : "unreachable");
            })
            .catch(() => !cancelled && setWarmth("unreachable"));

        return () => {
            cancelled = true;
        };
    }, []);

    return warmth;
}
