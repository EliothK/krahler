import { useEffect, useState } from "react";
import {
    fetchLiveActivity,
    relativeTime,
    GITHUB_USER,
    type Activity,
} from "../scripts/activity";

export default function RecentWork() {
    const [data, setData] = useState<Activity | null>(null);
    const [source, setSource] = useState<"build" | "live">("build");
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        fetch("/activity.json")
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((d: Activity) => !cancelled && setData(d))
            .catch(() => !cancelled && setFailed(true));

        fetchLiveActivity()
            .then((d) => {
                if (cancelled || !d || d.repos.length === 0) return;
                setData(d);
                setSource("live");
                setFailed(false);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="band" aria-labelledby="work-heading">
            <h2 id="work-heading" className="mb-2">
                What I'm working on now
            </h2>
            <p className="section-intro mb-4">
                Pulled from GitHub. Written into the site by the same pipeline
                that deploys it, and refreshed live in your browser when GitHub
                answers.
            </p>

            <ul className="work-list">
                {!data && !failed && (
                    <li>
                        <span className="work-empty">
                            Loading recent activity...
                        </span>
                    </li>
                )}

                {failed && !data && (
                    <li>
                        <span className="work-empty">
                            {" "}
                            GitHub isn't responding right now.{" "}
                        </span>
                        <a href={`https://github.com/${GITHUB_USER}`}>
                            The repositories are here.
                        </a>
                    </li>
                )}

                {data?.repos.length === 0 && (
                    <li>
                        <span className="work-empty">
                            Nothing public in the last 90 days. The private work
                            is what I'd talk about instead.
                        </span>
                    </li>
                )}

                {data?.repos.map((r) => (
                    <li key={r.name}>
                        <a className="work-repo" href={r.url}>
                            {r.name}
                        </a>
                        {r.commits ? (
                            <span className="work-commits">
                                {r.commits} commit{r.commits === 1 ? "" : "s"}
                            </span>
                        ) : null}
                        <span className="work-meta">
                            {r.language ? `${r.language} - ` : ""};
                        </span>
                        {r.description ? (
                            <p className="work-desc">{r.description}</p>
                        ) : null}
                    </li>
                ))}
            </ul>

            {data && (
                <p className="freshness">
                    {source === "live"
                        ? "Fetched from GitHub just now."
                        : `Written at build time ${relativeTime(data.generatedAt)} by the deploy pipeline.`}
                </p>
            )}
        </section>
    );
}
