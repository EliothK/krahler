import { render, screen, waitFor } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import RecentWork from "../../components/RecentWork";
import * as activity from "../../scripts/activity";

const repo = (over = {}) => ({
    name: "repo-a",
    description: "desc a",
    url: "https://github.com/u/repo-a",
    pushedAt: new Date().toISOString(),
    language: "TypeScript",
    ...over,
});

describe("RecentWork", () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
        vi.spyOn(activity, "fetchLiveActivity");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("shows a loading state before GitHub answers", () => {
        activity.fetchLiveActivity.mockReturnValue(new Promise(() => {}));
        render(<RecentWork />);
        expect(screen.getByText(/Loading recent activity/)).toBeInTheDocument();
    });

    it("renders repos from the live fetch and labels them as fresh", async () => {
        activity.fetchLiveActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [repo()],
        });

        render(<RecentWork />);

        await waitFor(() =>
            expect(screen.getByText("repo-a")).toBeInTheDocument(),
        );
        expect(screen.getByText("desc a")).toBeInTheDocument();
        expect(
            screen.getByText(/Fetched from GitHub just now/),
        ).toBeInTheDocument();
    });

    it("does not request a build-time activity.json", async () => {
        activity.fetchLiveActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [repo()],
        });

        render(<RecentWork />);

        await waitFor(() =>
            expect(screen.getByText("repo-a")).toBeInTheDocument(),
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("shows an error message when the live fetch yields nothing", async () => {
        activity.fetchLiveActivity.mockResolvedValue(null);

        render(<RecentWork />);

        await waitFor(() =>
            expect(
                screen.getByText(/GitHub isn't responding right now/),
            ).toBeInTheDocument(),
        );
    });

    it("shows an error message when the live fetch rejects", async () => {
        activity.fetchLiveActivity.mockRejectedValue(new Error("boom"));

        render(<RecentWork />);

        await waitFor(() =>
            expect(
                screen.getByText(/GitHub isn't responding right now/),
            ).toBeInTheDocument(),
        );
    });

    it("shows an empty state when there are no recent repos", async () => {
        activity.fetchLiveActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [],
        });

        render(<RecentWork />);

        await waitFor(() =>
            expect(
                screen.getByText(/Nothing public in the last 90 days/),
            ).toBeInTheDocument(),
        );
    });
});
