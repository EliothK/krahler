// Post-deploy smoke test. Runs against a live URL, not the source tree:
//
//   SMOKE_URL=https://<host> npm run smoke
//
// The unit tests can't see deployed configuration, so a typo in staticwebapp.config.json could drop a security header or the asset cache while every unit test stays green.
// These checks are what a visitor's browser would actually receive.
import { describe, it, expect, beforeAll } from "vitest";
import { connect } from "node:tls";

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

    describe("tls", () => {
        // Managed certificates renew themselves; this is the alarm if that ever stops working.
        it("serves a valid certificate with more than 14 days left", async () => {
            const { hostname } = new URL(BASE);
            const cert = await new Promise<{ valid_to: string; subjectaltname?: string }>(
                (resolve, reject) => {
                    const socket = connect(
                        { host: hostname, port: 443, servername: hostname },
                        () => {
                            const peer = socket.getPeerCertificate();
                            const authorized = socket.authorized;
                            socket.end();
                            if (!authorized) reject(new Error("certificate not trusted"));
                            else resolve(peer);
                        },
                    );
                    socket.on("error", reject);
                },
            );
            const daysLeft = (Date.parse(cert.valid_to) - Date.now()) / 86_400_000;
            expect(daysLeft).toBeGreaterThan(14);
        });
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

        // Crawlers, link unfurlers and résumé parsers don't run JavaScript, so the content has to be in the HTML itself.
        it("prerenders the home page content into the HTML", () => {
            expect(indexHtml).toContain("Elioth Krahler");
            for (const heading of ["Skills", "Experience", "Certifications"]) {
                expect(indexHtml).toMatch(new RegExp(`<h2[^>]*>${heading}<`));
            }
            expect(indexHtml).toContain('"@type": "Person"');
        });

        it("prerenders the build log with its own title", async () => {
            const html = await (await get("/build")).text();
            expect(html).toContain("<title>Build log - Elioth Krahler</title>");
            expect(html).toContain("Why it moved off AKS");
        });

        it("serves the résumé as a PDF, not the 404 page", async () => {
            const res = await get("/Elioth-Krahler-Resume.pdf");
            expect(res.status).toBe(200);
            expect(res.headers.get("content-type")).toContain("application/pdf");
        });

        it.each(["/robots.txt", "/sitemap.xml", "/favicon.svg", "/og.png"])(
            "serves %s",
            async (path) => {
                const res = await get(path);
                expect(res.status).toBe(200);
            },
        );

        // An unknown path used to get the home page with a 200, so a typo or a stale link looked like a real page to crawlers.
        it("returns a real 404 page for a path that isn't a page", async () => {
            const res = await get("/no-such-page");
            expect(res.status).toBe(404);
            const html = await res.text();
            expect(html).toContain("Page not found");
            expect(html).toContain('<meta name="robots" content="noindex"');
            expect(html).not.toContain('<link rel="canonical"');
        });

        it("still serves the build log with a trailing slash", async () => {
            const res = await get("/build/");
            expect(res.status).toBe(200);
            expect(await res.text()).toContain("<title>Build log - Elioth Krahler</title>");
        });

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
        // The prerendered <img> is in the HTML, so the browser's preload scanner starts it before React runs. A separate rel="preload" used to sit here too, and it downloaded the photo a second time at the wrong srcset size on phones.
        it("is in the prerendered HTML so it starts before React runs", () => {
            const host = AVATAR_HOST.replace(/\./g, "\\.");
            expect(indexHtml).toMatch(new RegExp(`rel="preconnect"[^>]*${host}`));
            expect(indexHtml).toMatch(new RegExp(`<source[^>]*srcSet="https://${host}/[^"]*s=160 160w`, "i"));
            expect(indexHtml).toMatch(new RegExp(`<img[^>]*class="profile-photo"[^>]*src="https://${host}/`));
        });

        it("isn't also preloaded, which would download it twice", () => {
            const host = AVATAR_HOST.replace(/\./g, "\\.");
            expect(indexHtml).not.toMatch(new RegExp(`rel="preload"[^>]*as="image"[^>]*${host}`));
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
