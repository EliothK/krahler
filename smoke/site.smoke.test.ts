// Post-deploy smoke test. Runs against a live URL, not the source tree:
//
//   SMOKE_URL=https://<host> npm run smoke
//
// The unit tests can't see deployed configuration, so a typo in staticwebapp.config.json could drop a security header or the asset cache while every unit test stays green.
// These checks are what a visitor's browser would actually receive.
import { describe, it, expect, beforeAll } from "vitest";

const BASE = (process.env.SMOKE_URL ?? "").replace(/\/$/, "");
if (!BASE) {
    throw new Error("Set SMOKE_URL to the site to test, e.g. https://example.com");
}

const AVATAR_HOST = "avatars.githubusercontent.com";

async function get(path: string, init?: RequestInit) {
    return fetch(`${BASE}${path}`, { redirect: "manual", ...init });
}

describe(`smoke: ${BASE}`, () => {
    let indexHtml = "";
    let indexHeaders: Headers;

    beforeAll(async () => {
        const res = await get("/");
        indexHeaders = res.headers;
        indexHtml = await res.text();
    });

    describe("pages", () => {
        it("serves the home page", async () => {
            const res = await get("/");
            expect(res.status).toBe(200);
            expect(res.headers.get("content-type")).toContain("text/html");
            expect(indexHtml).toContain('<div id="root">');
        });

        it("serves deep links with the app shell", async () => {
            const res = await get("/build");
            expect(res.status).toBe(200);
            expect(res.headers.get("content-type")).toContain("text/html");
        });

        it.each(["/robots.txt", "/favicon.svg", "/og.png"])(
            "serves %s",
            async (path) => {
                const res = await get(path);
                expect(res.status).toBe(200);
            },
        );

        it("returns 404 for a missing asset instead of the app shell", async () => {
            const res = await get("/assets/does-not-exist.js");
            expect(res.status).toBe(404);
        });
    });

    describe("security headers on the home page", () => {
        it("sets a content security policy that allows what the page needs", () => {
            const csp = indexHeaders.get("content-security-policy") ?? "";
            expect(csp).toContain("default-src 'self'");
            expect(csp).toContain("frame-ancestors");
            expect(csp).toContain(AVATAR_HOST);
            expect(csp).toContain("https://api.github.com");
            expect(csp).not.toContain("unsafe-eval");
        });

        it("sets the standard hardening headers", () => {
            expect(indexHeaders.get("x-content-type-options")).toBe("nosniff");
            expect(indexHeaders.get("x-frame-options")).toMatch(/SAMEORIGIN|DENY/);
            expect(indexHeaders.get("referrer-policy")).toBeTruthy();
            expect(indexHeaders.get("permissions-policy")).toBeTruthy();
        });

        it("sets HSTS without pinning subdomains", () => {
            const hsts = indexHeaders.get("strict-transport-security") ?? "";
            expect(hsts).toMatch(/max-age=\d+/);
            expect(hsts.toLowerCase()).not.toContain("includesubdomains");
        });

        it("never caches the app shell", () => {
            expect(indexHeaders.get("cache-control")).toContain("no-cache");
        });
    });

    describe("hashed assets", () => {
        let assetPaths: string[] = [];

        beforeAll(() => {
            assetPaths = [
                ...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g),
            ].map((m) => m[1]);
        });

        it("references at least one script and one stylesheet", () => {
            expect(assetPaths.some((p) => p.endsWith(".js"))).toBe(true);
            expect(assetPaths.some((p) => p.endsWith(".css"))).toBe(true);
        });

        it("caches every hashed asset forever and keeps nosniff", async () => {
            for (const path of assetPaths) {
                const res = await get(path);
                expect(res.status, path).toBe(200);
                expect(res.headers.get("cache-control"), path).toContain("immutable");
                expect(res.headers.get("x-content-type-options"), path).toBe("nosniff");
            }
        });

        it("compresses text assets", async () => {
            const js = assetPaths.find((p) => p.endsWith(".js"));
            const res = await get(js ?? "/", {
                headers: { "accept-encoding": "br, gzip" },
            });
            expect(res.headers.get("content-encoding")).toMatch(/br|gzip/);
        });
    });

    describe("profile photo", () => {
        it("is preloaded from the shell so it starts before React runs", () => {
            expect(indexHtml).toMatch(
                new RegExp(`rel="preconnect"[^>]*${AVATAR_HOST.replace(/\./g, "\\.")}`),
            );
            expect(indexHtml).toMatch(
                new RegExp(`rel="preload"[^>]*as="image"[^>]*${AVATAR_HOST.replace(/\./g, "\\.")}`),
            );
        });

        it("resolves to an image", async () => {
            const url = indexHtml.match(
                new RegExp(`https://${AVATAR_HOST.replace(/\./g, "\\.")}/[^"]+`),
            )?.[0];
            expect(url, "avatar URL in index.html").toBeTruthy();
            const res = await fetch(url!.replace(/&amp;/g, "&"));
            expect(res.status).toBe(200);
            expect(res.headers.get("content-type")).toContain("image/");
        });
    });
});
