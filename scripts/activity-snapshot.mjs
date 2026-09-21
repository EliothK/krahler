// Runs before `vite build` (npm's "prebuild" hook): saves what GitHub says right now to src/generated/activity.json.
// The page ships it as a fallback, so visitors and crawlers see real content when the browser's own GitHub request is rate-limited or fails.
// It never fails the build: without a snapshot the page just falls back to a link.
import { mkdir, rm, writeFile } from "node:fs/promises";

import { fetchLiveActivity } from "../src/scripts/activity.ts";

const out = "src/generated/activity.json";
const activity = await fetchLiveActivity(5, process.env.GITHUB_TOKEN);

if (activity) {
    await mkdir("src/generated", { recursive: true });
    await writeFile(out, JSON.stringify(activity, null, 2));
    console.log(`activity snapshot: ${activity.repos.length} repos -> ${out}`);
} else {
    await rm(out, { force: true });
    console.warn("activity snapshot: GitHub unavailable, building without one");
}
