import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import RecentWork from "../../components/RecentWork";
import * as activity from "../../scripts/activity";

describe("RecentWork", () => {
    beforeEach(() => {
        vi.spyOn(activity, "fetchLiveActivity").mockResolvedValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("shows a loading state before any data resolves", () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(() => new Promise(() => {})),
        );
        render(<RecentWork />);
        expect(screen.getByText(/Loading recent activity/)).toBeInTheDocument();
    });

    it("renders repos from build-time data", async () => {
        const data = {
            generatedAt: new Date().toISOString(),
            repos: [
                {
                    name: "repo-a",
                    description: "desc a",
                    url: "https://github.com/u/repo-a",
                    pushedAt: new Date().toISOString(),
                    language: "TypeScript",
                },
            ],
        };
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
        );

        render(<RecentWork />);

        await waitFor(() =>
            expect(screen.getByText("repo-a")).toBeInTheDocument(),
        );
        expect(screen.getByText("desc a")).toBeInTheDocument();
        expect(screen.getByText(/Written at build time/)).toBeInTheDocument();
    });

    it("shows an error message when the build-time fetch fails and live fetch yields nothing", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

        render(<RecentWork />);

        await waitFor(() =>
            expect(
                screen.getByText(/GitHub isn't responding right now/),
            ).toBeInTheDocument(),
        );
    });

    it("shows an empty state when there are no recent repos", async () => {
        const data = { generatedAt: new Date().toISOString(), repos: [] };
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: true, json: async () => data }),
        );

        render(<RecentWork />);

        await waitFor(() =>
            expect(
                screen.getByText(/Nothing public in the last 90 days/),
            ).toBeInTheDocument(),
        );
    });

    it("renders live data and labels it as freshly fetched", async () => {
        const liveData = {
            generatedAt: new Date().toISOString(),
            repos: [
                {
                    name: "live-repo",
                    description: null,
                    url: "https://github.com/u/live-repo",
                    pushedAt: new Date().toISOString(),
                    language: null,
                },
            ],
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
        activity.fetchLiveActivity.mockResolvedValue(liveData);

        render(<RecentWork />);

        await waitFor(() =>
            expect(screen.getByText("live-repo")).toBeInTheDocument(),
        );
        expect(screen.getByText(/Fetched from GitHub just now/)).toBeInTheDocument();
    });
});
