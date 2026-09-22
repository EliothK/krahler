import { renderHook, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import { useApiStatus } from "../../scripts/useApiStatus";

describe("useApiStatus", () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("starts as checking, then reports warm on a 200", async () => {
        fetchSpy.mockResolvedValue({ ok: true });
        const { result } = renderHook(() => useApiStatus());
        expect(result.current).toBe("checking");
        await waitFor(() => expect(result.current).toBe("warm"));
    });

    it("reports unreachable when the request fails", async () => {
        fetchSpy.mockRejectedValue(new Error("boom"));
        const { result } = renderHook(() => useApiStatus());
        await waitFor(() => expect(result.current).toBe("unreachable"));
    });

    it("reports unreachable on a non-ok response", async () => {
        fetchSpy.mockResolvedValue({ ok: false });
        const { result } = renderHook(() => useApiStatus());
        await waitFor(() => expect(result.current).toBe("unreachable"));
    });
});
