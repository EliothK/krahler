import { useEffect, useState } from "react";
import { API_BASE, COLD_START_TIMEOUT_MS } from "./api";

export type LiveStatus = {
    status: string;
    version: string;
    uptimeSeconds: number;
    time: string;
};

/**
 * Fetches the API's own /api/status on mount: the commit it's running and how long the current replica has been alive.
 * Unlike useApiStatus (which only asks "is it warm yet" for the contact form), this is for showing the payload itself as content.
 */
export function useLiveStatus() {
    const [status, setStatus] = useState<LiveStatus | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        fetch(`${API_BASE}/api/status`, {
            signal: AbortSignal.timeout(COLD_START_TIMEOUT_MS),
        })
            .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
            .then((data: LiveStatus) => {
                if (!cancelled) setStatus(data);
            })
            .catch(() => !cancelled && setFailed(true));

        return () => {
            cancelled = true;
        };
    }, []);

    return { status, failed };
}

export function formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remMinutes}m`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
}
