// Three hours of the API and database, before and after the fix that stopped startup from connecting.
// Minutes map to x as X0 + minute * PX; the uptime check cold-starts the API roughly every 20 minutes in both rows.
const X0 = 120;
const PX = 3;
const HOURS = 3;
const x = (minute: number) => X0 + minute * PX;
const END = x(HOURS * 60);

const STARTS = Array.from({ length: 9 }, (_, i) => 5 + i * 20);
const PAUSE_DELAY = 60;
const LAST_CONNECTION_AFTER = STARTS[0];
const PAUSED_AT = LAST_CONNECTION_AFTER + PAUSE_DELAY;

function Row({ y, label, connections, pausedAt }: { y: number; label: string; connections: number[]; pausedAt: number | null }) {
    const barY = y + 44;
    return (
        <g>
            <text x={X0 - 12} y={y + 18} className="tl-row-label" textAnchor="end">{label}</text>
            <text x={X0 - 12} y={y + 32} className="tl-lane" textAnchor="end">API</text>
            <text x={X0 - 12} y={barY + 9} className="tl-lane" textAnchor="end">database</text>

            {STARTS.map((m) => (
                <line key={`s${m}`} x1={x(m)} x2={x(m)} y1={y + 20} y2={y + 34} className="tl-start" />
            ))}
            {connections.map((m) => (
                <circle key={`c${m}`} cx={x(m)} cy={barY + 5} r="5" className="tl-connection" />
            ))}

            <rect x={X0} y={barY} width={(pausedAt === null ? END : x(pausedAt)) - X0} height="10" rx="2" className="tl-online" />
            {pausedAt !== null && (
                <>
                    <rect x={x(pausedAt)} y={barY} width={END - x(pausedAt)} height="10" rx="2" className="tl-paused" />
                    <text x={x(pausedAt) + 6} y={barY + 26} className="tl-note">paused: billing stops</text>
                </>
            )}
            {pausedAt === null && (
                <text x={X0} y={barY + 26} className="tl-note">never 60 minutes without a connection, so it never pauses</text>
            )}
        </g>
    );
}

// Decorative: the paragraph above it and the sr-only summary below carry the same information.
export default function SleepTimeline() {
    return (
        <figure className="tl-figure">
            <div className="tl-scroll">
                <svg className="tl" viewBox={`0 0 ${END + 20} 270`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <line x1={x(0)} x2={x(0)} y1="0" y2="10" className="tl-start" />
                    <text x={x(0) + 8} y="9" className="tl-lane">API cold start (uptime check)</text>
                    <circle cx={x(80)} cy="5" r="5" className="tl-connection" />
                    <text x={x(80) + 10} y="9" className="tl-lane">database connection</text>

                    <Row y={24} label="Before" connections={STARTS} pausedAt={null} />
                    <Row y={124} label="After" connections={[LAST_CONNECTION_AFTER]} pausedAt={PAUSED_AT} />

                    <line x1={x(LAST_CONNECTION_AFTER)} x2={x(PAUSED_AT)} y1="222" y2="222" className="tl-span" />
                    <text x={(x(LAST_CONNECTION_AFTER) + x(PAUSED_AT)) / 2} y="216" className="tl-lane" textAnchor="middle">60 idle minutes</text>

                    <line x1={X0} x2={END} y1="244" y2="244" className="tl-axis" />
                    {Array.from({ length: HOURS * 2 + 1 }, (_, i) => i * 30).map((m) => (
                        <g key={m}>
                            <line x1={x(m)} x2={x(m)} y1="244" y2="249" className="tl-axis" />
                            <text x={x(m)} y="264" className="tl-lane" textAnchor="middle">{m === 0 ? "0 min" : m}</text>
                        </g>
                    ))}
                </svg>
            </div>
            <figcaption className="visually-hidden">
                Before the fix, every API cold start, about three an hour, connected to the database, so it never reached 60 idle minutes and never paused.
                After the fix, cold starts don't connect, and the database pauses 60 minutes after the last real connection.
            </figcaption>
        </figure>
    );
}
