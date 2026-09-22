// The API runs on Azure Container Apps scaled to zero: a cold request can take up to about a minute while a replica starts.
// Anything that calls it needs generous timeouts and a state the visitor can read while it's slow, not a spinner that looks stuck.
export const API_BASE =
    import.meta.env?.VITE_API_BASE || "https://api.krahler.com";

export const COLD_START_TIMEOUT_MS = 60_000;
