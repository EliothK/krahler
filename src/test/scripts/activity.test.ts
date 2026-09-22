import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { countPushes, relativeTime, fetchLiveActivity, fetchProxiedActivity } from "../../scripts/activity";

describe("countPushes", () => {
    it("sums PushEvent commit counts per repo", () => {
        const events = [
            { type: "PushEvent", repo: { name: "user/repo-a" }, payload: { size: 2 } },
            { type: "PushEvent", repo: { name: "user/repo-a" }, payload: { size: 3 } },
            { type: "PushEvent", repo: { name: "user/repo-b" }, payload: { size: 1 } },
        ];
        expect(countPushes(events)).toEqual({ "repo-a": 5, "repo-b": 1 });
    });

    it("ignores non-PushEvent events", () => {
        const events = [
            { type: "WatchEvent", repo: { name: "user/repo-a" }, payload: { size: 5 } },
        ];
        expect(countPushes(events)).toEqual({});
    });

    it("treats a missing payload size as zero", () => {
        const events = [{ type: "PushEvent", repo: { name: "user/repo-a" } }];
        expect(countPushes(events)).toEqual({ "repo-a": 0 });
    });

    it("falls back to the full repo name when there is no slash", () => {
        const events = [
            { type: "PushEvent", repo: { name: "repo-a" }, payload: { size: 1 } },
        ];
        expect(countPushes(events)).toEqual({ "repo-a": 1 });
    });
});

describe("relativeTime", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-09T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("reports minutes ago for under an hour", () => {
        const iso = new Date("2026-09-09T11:50:00Z").toISOString();
        expect(relativeTime(iso)).toBe("10 min ago");
    });

    it("reports at least 1 min ago for very recent times", () => {
        const iso = new Date("2026-09-09T11:59:59.900Z").toISOString();
        expect(relativeTime(iso)).toBe("1 min ago");
    });

    it("reports hours ago for under a day", () => {
        const iso = new Date("2026-09-09T09:00:00Z").toISOString();
        expect(relativeTime(iso)).toBe("3 hr ago");
    });

    it("reports 'yesterday' for one day ago", () => {
        const iso = new Date("2026-09-08T12:00:00Z").toISOString();
        expect(relativeTime(iso)).toBe("yesterday");
    });

    it("reports a month/year for older dates", () => {
        const iso = new Date("2026-01-01T12:00:00Z").toISOString();
        expect(relativeTime(iso)).toBe(
            new Date(iso).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
            }),
        );
    });
});

describe("fetchLiveActivity", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns null when the repos request fails", async () => {
        (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
        });
        const result = await fetchLiveActivity();
        expect(result).toBeNull();
    });

    it("returns null when fetch throws", async () => {
        (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error("network down"),
        );
        const result = await fetchLiveActivity();
        expect(result).toBeNull();
    });

    it("filters forks and archived repos, maps fields, respects the limit, and attaches commit counts", async () => {
        const repos = [
            {
                name: "a",
                description: "repo a",
                html_url: "https://github.com/u/a",
                pushed_at: "2026-09-01T00:00:00Z",
                language: "TypeScript",
                fork: false,
                archived: false,
            },
            {
                name: "forked",
                description: null,
                html_url: "https://github.com/u/forked",
                pushed_at: "2026-09-01T00:00:00Z",
                language: null,
                fork: true,
                archived: false,
            },
            {
                name: "old",
                description: null,
                html_url: "https://github.com/u/old",
                pushed_at: "2026-09-01T00:00:00Z",
                language: null,
                fork: false,
                archived: true,
            },
            {
                name: "b",
                description: "repo b",
                html_url: "https://github.com/u/b",
                pushed_at: "2026-09-01T00:00:00Z",
                language: "Python",
                fork: false,
                archived: false,
            },
        ];
        const events = [
            { type: "PushEvent", repo: { name: "u/a" }, payload: { size: 4 } },
        ];

        (fetch as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ ok: true, json: async () => repos })
            .mockResolvedValueOnce({ ok: true, json: async () => events });

        const result = await fetchLiveActivity(1);
        expect(result).not.toBeNull();
        expect(result?.repos).toHaveLength(1);
        expect(result?.repos[0]).toMatchObject({
            name: "a",
            description: "repo a",
            url: "https://github.com/u/a",
            language: "TypeScript",
            commits: 4,
        });
    });

    it("still returns repos when the events request fails", async () => {
        const repos = [
            {
                name: "a",
                description: "repo a",
                html_url: "https://github.com/u/a",
                pushed_at: "2026-09-01T00:00:00Z",
                language: "TypeScript",
                fork: false,
                archived: false,
            },
        ];

        (fetch as unknown as ReturnType<typeof vi.fn>)
            .mockResolvedValueOnce({ ok: true, json: async () => repos })
            .mockResolvedValueOnce({ ok: false });

        const result = await fetchLiveActivity();
        expect(result).not.toBeNull();
        expect(result?.repos).toHaveLength(1);
        expect(result?.repos[0].commits).toBeUndefined();
    });
});

describe("fetchProxiedActivity", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("returns the parsed activity from the API", async () => {
        const body = { generatedAt: "2026-09-22T00:00:00Z", repos: [] };
        (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: true,
            json: async () => body,
        });
        const result = await fetchProxiedActivity();
        expect(result).toEqual(body);
    });

    it("returns null when the API responds with an error status", async () => {
        (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
            ok: false,
        });
        expect(await fetchProxiedActivity()).toBeNull();
    });

    it("returns null when the request throws or times out", async () => {
        (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
            new Error("network down"),
        );
        expect(await fetchProxiedActivity()).toBeNull();
    });
});
