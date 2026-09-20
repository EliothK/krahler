// Lighthouse score gate against a live URL:
//
//   SMOKE_URL=https://<host> npm run lighthouse
//
// Needs a Chromium-based browser (set CHROME_PATH if it isn't found). Runs the
// Lighthouse CLI through npx so it stays out of the project's dependencies.
// Thresholds sit a little under the scores measured on 2026-09-20 (mobile
// performance 0.91, everything else 1.00), so ordinary noise doesn't fail a
// deploy but a real regression does.
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

const URL_UNDER_TEST = (process.env.SMOKE_URL ?? "").replace(/\/$/, "") + "/";
if (URL_UNDER_TEST === "/") {
    throw new Error("Set SMOKE_URL to the site to test, e.g. https://example.com");
}

const LIGHTHOUSE = "lighthouse@13.5.0";

const THRESHOLDS = {
    performance: 0.85,
    accessibility: 0.95,
    "best-practices": 0.95,
    seo: 0.95,
} as const;

type Report = {
    categories: Record<string, { score: number | null }>;
    audits: Record<string, { score: number | null; title: string }>;
};

function runLighthouse(preset: "mobile" | "desktop"): Report {
    const args = [
        "--yes",
        LIGHTHOUSE,
        URL_UNDER_TEST,
        "--output=json",
        "--output-path=stdout",
        "--quiet",
        `--only-categories=${Object.keys(THRESHOLDS).join(",")}`,
        "--chrome-flags=--headless=new --no-sandbox",
    ];
    if (preset === "desktop") args.push("--preset=desktop");
    const stdout = execFileSync("npx", args, {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(stdout) as Report;
}

describe.each(["mobile", "desktop"] as const)(`lighthouse (${URL_UNDER_TEST}) %s`, (preset) => {
    // Scores wobble a little run to run, so one retry before failing a deploy.
    it("clears every score threshold", { timeout: 180_000, retry: 1 }, () => {
        const report = runLighthouse(preset);
        for (const [category, min] of Object.entries(THRESHOLDS)) {
            const score = report.categories[category]?.score;
            expect(score, `${category} produced no score`).not.toBeNull();
            expect(score ?? 0, `${preset} ${category}`).toBeGreaterThanOrEqual(min);
        }
    });

    it("logs no browser console errors", { timeout: 180_000 }, () => {
        const report = runLighthouse(preset);
        expect(report.audits["errors-in-console"]?.score, "errors-in-console").toBe(1);
    });
});
