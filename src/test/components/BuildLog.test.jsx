import { render, screen } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import BuildLog from "../../components/BuildLog";

describe("BuildLog", () => {
    beforeEach(() => {
        // BuildLog embeds the live ApiStatusPanel, which calls /api/status on mount.
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("renders exactly one h1 and a way back", () => {
        render(<BuildLog />);
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
        expect(screen.getByRole("link", { name: /back to the portfolio/i })).toHaveAttribute("href", "/");
    });

    it("sets the document title", () => {
        render(<BuildLog />);
        expect(document.title).toMatch(/build log/i);
    });

    it("shows the current architecture and the API/database chapter", () => {
        render(<BuildLog />);
        expect(
            screen.getByRole("heading", { name: /how it's built now/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /building the api and database/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /what's running right now/i }),
        ).toBeInTheDocument();
    });

    it("includes the pipeline flow and the database sleep story", () => {
        render(<BuildLog />);
        expect(
            screen.getByRole("heading", { name: /how a change gets there/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /why the database never slept/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /only half of it/i }),
        ).toBeInTheDocument();
    });
});
