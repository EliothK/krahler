// Checks that need a real browser engine, which jsdom can't provide:
//
//   SMOKE_URL=https://<host> npm run browser
//
// Uses playwright-core with an already-installed Chromium-based browser (set CHROME_PATH if it isn't found), so no browser download lands in the project.
/// <reference lib="dom" />
// (DOM types because the page.evaluate callbacks run inside the browser.)
import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";

const URL_UNDER_TEST = (process.env.SMOKE_URL ?? "").replace(/\/$/, "") + "/";
if (URL_UNDER_TEST === "/") {
    throw new Error("Set SMOKE_URL to the site to test, e.g. https://example.com");
}

const CANDIDATES = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/var/lib/flatpak/app/com.brave.Browser/current/active/files/brave/brave",
];
const executablePath = CANDIDATES.find((p) => p && existsSync(p));
if (!executablePath) {
    throw new Error("No Chromium-based browser found; set CHROME_PATH");
}

// Scrolls to a fraction of the page and returns how far down the page actually is (0..1) alongside the reading-progress bar's horizontal scale.
async function progressAt(
    page: Page,
    fraction: number,
): Promise<{ scrolled: number; bar: number }> {
    return page.evaluate(async (f) => {
        const root = document.documentElement;
        scrollTo({ top: (root.scrollHeight - root.clientHeight) * f, behavior: "instant" });
        // The bar updates on the next animation frame, so wait two to be safe.
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const bar = document.querySelector(".read-progress");
        if (!bar) throw new Error("No .read-progress element on the page");
        const t = getComputedStyle(bar).transform;
        return {
            scrolled: root.scrollTop / (root.scrollHeight - root.clientHeight),
            bar: t === "none" ? 1 : new DOMMatrixReadOnly(t).a,
        };
    }, fraction);
}

// The bar runs from 2% (so it's visible at the top) to 100%.
const expectedBar = (scrolled: number) => 0.02 + 0.98 * scrolled;

describe(`browser checks: ${URL_UNDER_TEST}`, () => {
    let browser: Browser;
    let page: Page;

    beforeAll(async () => {
        browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
        page = await browser.newPage({
            viewport: { width: 1280, height: 800 },
            reducedMotion: "no-preference",
        });
        await page.goto(URL_UNDER_TEST, { waitUntil: "load" });
    });

    afterAll(async () => {
        await browser?.close();
    });

    it("grows the reading-progress bar as the page scrolls", async () => {
        for (const fraction of [0, 0.5, 1]) {
            const { scrolled, bar } = await progressAt(page, fraction);
            expect(bar).toBeCloseTo(expectedBar(scrolled), 2);
        }
        expect((await progressAt(page, 0)).bar).toBeLessThan(0.1);
        expect((await progressAt(page, 1)).bar).toBeGreaterThan(0.95);
    });

    // It only moves when the reader scrolls, so reduced motion shouldn't freeze it (which used to leave it stuck at full width).
    it("keeps tracking the scroll for readers who ask for reduced motion", async () => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        const { scrolled, bar } = await progressAt(page, 0.5);
        expect(bar).toBeCloseTo(expectedBar(scrolled), 2);
        expect(bar).toBeLessThan(0.9);
        await page.emulateMedia({ reducedMotion: "no-preference" });
    });
});
