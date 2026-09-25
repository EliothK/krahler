// A decorative diagram of the same information the paragraph above it already states in words, so it's aria-hidden rather than described twice to a screen reader.
export default function ArchitectureDiagram() {
    return (
        <svg
            className="arch-diagram"
            viewBox="0 0 720 300"
            role="img"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <marker
                    id="arch-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="7"
                    markerHeight="7"
                    orient="auto-start-reverse"
                >
                    <path d="M0,0 L10,5 L0,10 z" className="arch-arrowhead" />
                </marker>
            </defs>

            {/* Browser */}
            <rect
                x="290"
                y="10"
                width="140"
                height="44"
                rx="6"
                className="arch-box arch-neutral"
            />
            <text x="360" y="37" className="arch-label" textAnchor="middle">
                Browser
            </text>

            {/* Browser -> SWA */}
            <path
                d="M320,54 L150,110"
                className="arch-edge"
                markerEnd="url(#arch-arrow)"
            />
            {/* Browser -> API */}
            <path
                d="M400,54 L570,110"
                className="arch-edge"
                markerEnd="url(#arch-arrow)"
            />

            {/* Static Web App */}
            <rect
                x="30"
                y="112"
                width="220"
                height="52"
                rx="6"
                className="arch-box arch-flux"
            />
            <text x="140" y="134" className="arch-label" textAnchor="middle">
                Static Web Apps
            </text>
            <text x="140" y="152" className="arch-sublabel" textAnchor="middle">
                prerendered React, CDN, staging env
            </text>

            {/* Container App */}
            <rect
                x="470"
                y="112"
                width="220"
                height="52"
                rx="6"
                className="arch-box arch-flux"
            />
            <text x="580" y="134" className="arch-label" textAnchor="middle">
                Container App
            </text>
            <text x="580" y="152" className="arch-sublabel" textAnchor="middle">
                Spring Boot, scale-to-zero
            </text>

            {/* API -> SQL */}
            <path
                d="M580,164 L580,206"
                className="arch-edge"
                markerEnd="url(#arch-arrow)"
            />

            {/* Azure SQL */}
            <rect
                x="470"
                y="208"
                width="220"
                height="52"
                rx="6"
                className="arch-box arch-solar"
            />
            <text x="580" y="230" className="arch-label" textAnchor="middle">
                Azure SQL
            </text>
            <text x="580" y="248" className="arch-sublabel" textAnchor="middle">
                serverless, auto-pause 1h idle
            </text>

            {/* GitHub Actions */}
            <rect
                x="30"
                y="208"
                width="220"
                height="52"
                rx="6"
                className="arch-box arch-neutral"
            />
            <text x="140" y="230" className="arch-label" textAnchor="middle">
                GitHub Actions
            </text>
            <text x="140" y="248" className="arch-sublabel" textAnchor="middle">
                OIDC, no stored secret
            </text>

            {/* GitHub -> SWA */}
            <path
                d="M140,208 L140,164"
                className="arch-edge"
                markerEnd="url(#arch-arrow)"
            />
            {/* GitHub -> API */}
            <path
                d="M250,225 C 380,225 380,140 468,138"
                className="arch-edge"
                fill="none"
                markerEnd="url(#arch-arrow)"
            />
        </svg>
    );
}
