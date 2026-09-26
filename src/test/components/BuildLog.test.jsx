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

    it("opens with a four-line summary that links to the best story", () => {
        const { container } = render(<BuildLog />);
        const glance = container.querySelector(".glance");
        expect(glance.querySelectorAll("li")).toHaveLength(4);
        expect(glance.textContent).toMatch(/\$9 a month/);
        const link = [...glance.querySelectorAll("a")].find((a) => a.getAttribute("href") === "#inc2-heading");
        expect(link).toBeTruthy();
        expect(container.querySelector("#inc2-heading")).not.toBeNull();
    });

    it("writes up the real incident with every postmortem field", () => {
        render(<BuildLog />);
        const section = screen.getByRole("heading", { name: /INC-002/ }).closest("section");
        const fields = [...section.querySelectorAll("dt")].map((dt) => dt.textContent);
        expect(fields).toEqual(["Detected", "Impact", "Cause", "Resolved", "Prevention"]);
        // The lesson it drew (catch it on day one, not by hand) is now in place, so the write-up says so.
        expect(section.textContent).toMatch(/\$2 monthly budget/);
    });

    it("reports current numbers as well as the AKS-era ones, with no placeholders left", () => {
        render(<BuildLog />);
        expect(screen.getByRole("heading", { name: "On AKS" })).toBeInTheDocument();
        const section = screen.getByRole("heading", { name: "Numbers" }).closest("section");
        const values = [...section.querySelectorAll("dd")].map((dd) => dd.textContent);
        const coldStart = [...section.querySelectorAll("dt")].findIndex((dt) => /cold start/i.test(dt.textContent));
        expect(coldStart).toBeGreaterThanOrEqual(0);
        // Every current value is a measurement: it has a number in it, not a stand-in like COLD_START.
        for (const v of values) expect(v).toMatch(/\d/);
    });

    it("no longer calls the lab's apply-order bug unfixed", () => {
        const { container } = render(<BuildLog />);
        expect(container.textContent).not.toMatch(/still unfixed/i);
        expect(container.textContent).toMatch(/kustomization\.yaml/);
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
