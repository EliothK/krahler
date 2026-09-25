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

    it("scrolls to the section named in the URL fragment", () => {
        const scrolled = vi.fn();
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = scrolled;
        window.history.replaceState(null, "", "/build#sleep-heading");
        try {
            render(<BuildLog />);
            expect(scrolled).toHaveBeenCalledTimes(1);
            expect(scrolled.mock.contexts[0].id).toBe("sleep-heading");
        } finally {
            Element.prototype.scrollIntoView = original;
            window.history.replaceState(null, "", "/");
        }
    });

    it("doesn't scroll without a fragment, or for one that matches nothing", () => {
        const scrolled = vi.fn();
        const original = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = scrolled;
        try {
            window.history.replaceState(null, "", "/build");
            render(<BuildLog />);
            window.history.replaceState(null, "", "/build#no-such-section");
            render(<BuildLog />);
            expect(scrolled).not.toHaveBeenCalled();
        } finally {
            Element.prototype.scrollIntoView = original;
            window.history.replaceState(null, "", "/");
        }
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
