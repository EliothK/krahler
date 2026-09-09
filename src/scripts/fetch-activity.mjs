/**
 * Writes public/activity.json before vite build
 *
 * Usage in package.json:
 *  "prebuild": "node scripts/fetch-activity.mjs"
 */

import { writeFile, mkdir} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USER = process.env.GITHUB_USER ?? "eliothkrahler";
const LIMIT = Number(process.env.ACTIVITY_LIMIT ?? 5);
const OUT = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "public",
    "activity.json",
);

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": `${USER}-portfolio-build`,
    ...(token ? { Authorization: `Bearer ${token}`} : {}),
};

async function gh(path) {
    const res = await fetch(`https://api.github.com${path}`, { headers});
    if (!res.ok){
        throw new Error(
            `GitHub ${res.status} on ${path}` +
            (res.status === 403 ? ` (rate limit remaining: ${res.headers.get("x-ratelimit-remaining")})` : ""),);
    }
    return res.json()
}

function countPushes(events) {
    const out = {};
    for (const e of events){
        if (e.type !== "PushEvent") continue;
        const name = e.repo.name.split("/")[1] ?? e.repo.name;
        out[name] = (out[name] ?? 0) + (e.payload?.size ?? 0);
    }
    return out;
}

async function main() {
    let payload = {generatedAt: new Date().toISOString(), repos: []};

    try {
        const repos = await gh(
            `/users/${USER}/repos?sort=pushed&direction=desc&per_page=30`,
        );

        let counts = {};
        try{
            counts = countPushes( await gh(`/users/${USER}/events/public?per_page=100`),);
        } catch (err) {
            console.warn(`[activity] commit counts unavailable: ${err.message}`);
        }

        payload.repos = repos
            .filter((r) => !r.fork && !r.archived)
            .slice(0, LIMIT)
            .map((r) => ({
                name: r.name,
                description: r.description,
                url: r.html_url,
                pushedAt: r.pushed_at,
                language: r.language,
                commits: counts[r.name],
            }));

        console.log(
            `[activity] ${payload.repos.length} repos, auth=${token ? "token": "anonymous"}`,
        );

    } catch(err) {
        console.warn(`[activity] falling back to empty: ${err.message}`);
    }

    await mkdir(dirname(OUT), {recursive: true});
    await writeFile(OUT, JSON.stringify(payload, null, 2));
    console.log(`[activity] wrote ${OUT}`);

}

main();