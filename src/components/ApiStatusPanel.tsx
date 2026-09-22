import { formatUptime, useLiveStatus } from "../scripts/useLiveStatus";

const REPO = "https://github.com/EliothK/krahler";

/**
 * A live panel fed by GET /api/status: not a mockup of what the API returns, the actual response, fetched when this page loads.
 * A short uptime means a cold start woke it up just now; a long one means it's been serving real traffic since it last restarted.
 */
export default function ApiStatusPanel() {
    const { status, failed } = useLiveStatus();

    return (
        <section className="band" aria-labelledby="status-heading">
            <h2 id="status-heading" className="mb-2">
                What&apos;s running right now
            </h2>
            <p className="section-intro mb-3">
                Live from <code>GET /api/status</code> on the Container App this
                page just called, not a static claim.
            </p>

            {!status && !failed && (
                <p className="freshness">Asking the API...</p>
            )}

            {failed && !status && (
                <p className="freshness">
                    The API didn&apos;t answer in time. It scales to zero and a
                    cold start can take about a minute; reload to try again.
                </p>
            )}

            {status && (
                <dl className="status-grid">
                    <div className="entry">
                        <dt>Status</dt>
                        <dd>{status.status}</dd>
                    </div>
                    <div className="entry">
                        <dt>Running commit</dt>
                        <dd>
                            <a
                                href={`${REPO}/commit/${status.version}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {status.version === "dev"
                                    ? "dev"
                                    : status.version.slice(0, 7)}
                            </a>
                        </dd>
                    </div>
                    <div className="entry">
                        <dt>This replica&apos;s uptime</dt>
                        <dd>{formatUptime(status.uptimeSeconds)}</dd>
                    </div>
                </dl>
            )}
        </section>
    );
}
