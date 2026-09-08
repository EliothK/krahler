export const GITHUB_USER = import.meta.env.VITE_GITHUB_USER ?? "eliothkrahler";

export type RepoActivity = {
    name: string;
    description: string | null;
    url: string;
    pushedAt: string;
    language: string |null;
    commits?: number;
};

export type Activity = {
    generatedAt: string;
    repos: RepoActivity[];
};

const API = "https://api.github.com";
const HEADERS = { Accept: "application/vnd.github+json"};

const DEFAULT_LIMIT = Number(import.meta.env.VITE_ACTIVITY_LIMIT ?? 5);

export async function fetchLiveActivity(limit = DEFAULT_LIMIT): Promise<Activity | null> {
    try {
        const reposRes = await fetch(
            `${API}/users/${GITHUB_USER}/repos?sort=pushed&direction=desc&per_page=30`,
            {headers: HEADERS},
        );
        if (!reposRes.ok) return null;

        type GhRepo= {
            name:string;
            description: string|null;
            html_url: string;
            pushed_at:string;
            language:string|null;
            fork:boolean;
            archived:boolean;
        };

        const repos: RepoActivity[] = (await reposRes.json() as GhRepo[])
            .filter((r) => !r.fork && !r.archived)
            .slice(0,limit)
            .map((r) => ({
                name: r.name,
                description: r.description,
                url: r.html_url,
                pushedAt: r.pushed_at,
                language: r.language,
            }));

        try {
            const evRes = await fetch(
                `${API}/users/${GITHUB_USER}/events/public?per_page=100`,
                {headers: HEADERS},
            );
            if (evRes.ok){
                const counts = countPushes(await evRes.json());
                for (const r of repos) r.commits = counts[r.name];
            }
        } catch {
            // repos without commit counts are fine
        }
        return { generatedAt: new Date().toISOString(), repos};
    } catch {
        return null;
    }
}

type GhEvent = {
    type: string;
    repo: {name: string};
    payload?: {size?: number};
};
// Sum PushEvent commit counts per repo. Keys are bare repo names
export function countPushes(events: GhEvent[]): Record<string, number>{
    const out: Record<string, number> = {};
    for (const e of events){
        if(e.type !== "PushEvent") continue;
        const name = e.repo.name.split("/")[1] ?? e.repo.name;
        out[name] =  (out[name] ?? 0) + (e.payload?.size ?? 0);
    }
    return out;
}

export function relativeTime(iso:string): string {
    const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
    if (seconds < 3600) return `${Math.max(1, Math.round(seconds/60))} min ago`;
    if (seconds < 86400) return `${Math.max(1, Math.round(seconds/3600))} hr ago`;
    const days = Math.round(seconds/86400);
    if (days === 1) return "yesterday";
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
    });
}