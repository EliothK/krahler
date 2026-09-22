import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach, describe, it, expect } from "vitest";
import ApiStatusPanel from "../../components/ApiStatusPanel";

describe("ApiStatusPanel", () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("shows a checking state before the API answers", () => {
        fetchSpy.mockReturnValue(new Promise(() => {}));
        render(<ApiStatusPanel />);
        expect(screen.getByText(/Asking the API/)).toBeInTheDocument();
    });

    it("renders the live status once fetched", async () => {
        fetchSpy.mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "ok",
                version: "abcdef1234567",
                uptimeSeconds: 125,
                time: "2026-09-22T00:00:00Z",
            }),
        });
        render(<ApiStatusPanel />);

        await waitFor(() => expect(screen.getByText("ok")).toBeInTheDocument());
        expect(screen.getByText("2m")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "abcdef1" });
        expect(link).toHaveAttribute(
            "href",
            "https://github.com/EliothK/krahler/commit/abcdef1234567",
        );
    });

    it("shows a fallback message when the API doesn't answer", async () => {
        fetchSpy.mockResolvedValue({ ok: false });
        render(<ApiStatusPanel />);
        await waitFor(() =>
            expect(screen.getByText(/didn't answer in time/)).toBeInTheDocument(),
        );
    });
});
