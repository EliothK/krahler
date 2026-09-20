import { useEffect, useState } from "react";
import {
  fetchLiveActivity,
  GITHUB_USER,
  type Activity,
} from "../scripts/activity";

export default function RecentWork() {
  const [data, setData] = useState<Activity | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchLiveActivity()
      .then((d) => {
        if (cancelled) return;
        if (d) setData(d);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
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
        Pulled from GitHub live, in your browser, each time the page loads.
      </p>

      <ul className="work-list">
        {!data && !failed && (
          <li>
            <span className="work-empty">Loading recent activity...</span>
          </li>
        )}

        {failed && !data && (
          <li>
            <span className="work-empty">
              {" "}
              GitHub isn't responding right now.{" "}
            </span>
            <a
              href={`https://github.com/${GITHUB_USER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              The repositories are here.
            </a>
          </li>
        )}

        {data?.repos.length === 0 && (
          <li>
            <span className="work-empty">
              Nothing public in the last 90 days. The private work is what I'd
              talk about instead.
            </span>
          </li>
        )}

        {data?.repos.map((r) => (
          <li key={r.name}>
            <a
              className="work-repo"
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {r.name}
            </a>
            {r.commits ? (
              <span className="work-commits">
                {r.commits} commit{r.commits === 1 ? "" : "s"}
              </span>
            ) : null}
            <span className="work-meta">
              {r.language ? `${r.language} - ` : ""}
            </span>
            {r.description ? (
              <p className="work-desc">{r.description}</p>
            ) : null}
          </li>
        ))}
      </ul>

      {data && <p className="freshness">Fetched from GitHub just now.</p>}
    </section>
  );
}
