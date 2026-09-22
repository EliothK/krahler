import { renderHook, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import { useLiveStatus, formatUptime } from "../../scripts/useLiveStatus";

describe("useLiveStatus", () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("returns the parsed status on a 200", async () => {
        const body = { status: "ok", version: "abc123", uptimeSeconds: 42, time: "2026-09-22T00:00:00Z" };
        fetchSpy.mockResolvedValue({ ok: true, json: async () => body });
        const { result } = renderHook(() => useLiveStatus());
        expect(result.current.status).toBeNull();
        await waitFor(() => expect(result.current.status).toEqual(body));
        expect(result.current.failed).toBe(false);
    });

    it("reports failed on a non-ok response", async () => {
        fetchSpy.mockResolvedValue({ ok: false });
        const { result } = renderHook(() => useLiveStatus());
        await waitFor(() => expect(result.current.failed).toBe(true));
        expect(result.current.status).toBeNull();
    });

    it("reports failed when the request throws", async () => {
        fetchSpy.mockRejectedValue(new Error("boom"));
        const { result } = renderHook(() => useLiveStatus());
        await waitFor(() => expect(result.current.failed).toBe(true));
    });
});

describe("formatUptime", () => {
    it("formats seconds under a minute", () => {
        expect(formatUptime(42)).toBe("42s");
    });

    it("formats minutes under an hour", () => {
        expect(formatUptime(150)).toBe("2m");
    });

    it("formats hours and minutes under a day", () => {
        expect(formatUptime(3 * 3600 + 5 * 60)).toBe("3h 5m");
    });

    it("formats days and hours", () => {
        expect(formatUptime(2 * 86400 + 4 * 3600)).toBe("2d 4h");
    });
});
