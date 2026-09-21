import { useEffect, useState } from "react";
import {
  fetchLiveActivity,
  GITHUB_USER,
  type Activity,
} from "../scripts/activity";
import { SNAPSHOT } from "../scripts/snapshot";

// `snapshot` is what GitHub said at build time. It's shown straight away (and is in the prerendered HTML), then replaced by the live answer, and it stays on screen if the live request fails.
export default function RecentWork({
  snapshot = SNAPSHOT,
}: {
  snapshot?: Activity | null;
}) {
  const [data, setData] = useState<Activity | null>(snapshot);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchLiveActivity()
      .then((d) => {
        if (cancelled) return;
        if (d) {
          setData(d);
          setLive(true);
        } else setFailed(true);
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
        Pulled from GitHub in your browser each time the page loads, with the
        last build's copy as a fallback.
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

      {data && live && (
        <p className="freshness">Fetched from GitHub just now.</p>
      )}
      {data && !live && (
        <p className="freshness">
          {failed
            ? "GitHub's live data isn't available right now. "
            : ""}
          Snapshot from {data.generatedAt.slice(0, 10)}.
        </p>
      )}
    </section>
  );
}
