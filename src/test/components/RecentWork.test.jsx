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
        vi.spyOn(activity, "fetchProxiedActivity");
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it("shows a loading state before the API answers", () => {
        activity.fetchProxiedActivity.mockReturnValue(new Promise(() => {}));
        render(<RecentWork snapshot={null} />);
        expect(screen.getByText(/Loading recent activity/)).toBeInTheDocument();
    });

    it("renders repos from the live fetch and labels them as fresh", async () => {
        activity.fetchProxiedActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [repo()],
        });

        render(<RecentWork snapshot={null} />);

        await waitFor(() =>
            expect(screen.getByText("repo-a")).toBeInTheDocument(),
        );
        expect(screen.getByText("desc a")).toBeInTheDocument();
        expect(
            screen.getByText(/Fetched from GitHub just now/),
        ).toBeInTheDocument();
    });

    it("does not request a build-time activity.json", async () => {
        activity.fetchProxiedActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [repo()],
        });

        render(<RecentWork snapshot={null} />);

        await waitFor(() =>
            expect(screen.getByText("repo-a")).toBeInTheDocument(),
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("shows an error message when the live fetch yields nothing", async () => {
        activity.fetchProxiedActivity.mockResolvedValue(null);

        render(<RecentWork snapshot={null} />);

        await waitFor(() =>
            expect(
                screen.getByText(/GitHub isn't responding right now/),
            ).toBeInTheDocument(),
        );
    });

    it("shows an error message when the live fetch rejects", async () => {
        activity.fetchProxiedActivity.mockRejectedValue(new Error("boom"));

        render(<RecentWork snapshot={null} />);

        await waitFor(() =>
            expect(
                screen.getByText(/GitHub isn't responding right now/),
            ).toBeInTheDocument(),
        );
    });

    it("shows the build-time snapshot immediately instead of a spinner", () => {
        activity.fetchProxiedActivity.mockReturnValue(new Promise(() => {}));
        render(
            <RecentWork
                snapshot={{
                    generatedAt: "2026-09-20T00:00:00.000Z",
                    repos: [repo({ name: "snap-repo" })],
                }}
            />,
        );
        expect(screen.getByText("snap-repo")).toBeInTheDocument();
        expect(screen.queryByText(/Loading recent activity/)).toBeNull();
        expect(screen.getByText(/Snapshot from 2026-09-20/)).toBeInTheDocument();
    });

    it("keeps the snapshot and says so when the live fetch fails", async () => {
        activity.fetchProxiedActivity.mockResolvedValue(null);
        render(
            <RecentWork
                snapshot={{
                    generatedAt: "2026-09-20T00:00:00.000Z",
                    repos: [repo({ name: "snap-repo" })],
                }}
            />,
        );
        await waitFor(() =>
            expect(
                screen.getByText(/live data isn't available right now/),
            ).toBeInTheDocument(),
        );
        expect(screen.getByText("snap-repo")).toBeInTheDocument();
    });

    it("replaces the snapshot with live data when it arrives", async () => {
        activity.fetchProxiedActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [repo({ name: "live-repo" })],
        });
        render(
            <RecentWork
                snapshot={{
                    generatedAt: "2026-09-20T00:00:00.000Z",
                    repos: [repo({ name: "snap-repo" })],
                }}
            />,
        );
        await waitFor(() =>
            expect(screen.getByText("live-repo")).toBeInTheDocument(),
        );
        expect(screen.queryByText("snap-repo")).toBeNull();
        expect(screen.getByText(/Fetched from GitHub just now/)).toBeInTheDocument();
    });

    it("shows an empty state when there are no recent repos", async () => {
        activity.fetchProxiedActivity.mockResolvedValue({
            generatedAt: new Date().toISOString(),
            repos: [],
        });

        render(<RecentWork snapshot={null} />);

        await waitFor(() =>
            expect(
                screen.getByText(/Nothing public in the last 90 days/),
            ).toBeInTheDocument(),
        );
    });
});
