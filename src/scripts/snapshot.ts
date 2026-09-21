import type { Activity } from "./activity";

// scripts/activity-snapshot.mjs writes this file at build time. It's git-ignored, so the glob matches nothing when it doesn't exist (a fresh clone, or a build with GitHub down).
const files = import.meta.glob<Activity>("../generated/activity.json", {
    eager: true,
    import: "default",
});

export const SNAPSHOT: Activity | null = Object.values(files)[0] ?? null;
