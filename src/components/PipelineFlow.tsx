// How a change reaches production, as three lanes of steps.
// Built from an ordered list rather than an SVG so the text reflows on a phone and a screen reader reads it as steps.
type Step = { title: string; detail: string; gate?: boolean };

const LANES: { heading: string; steps: Step[] }[] = [
    {
        heading: "Every pull request",
        steps: [
            { title: "CI", detail: "audit, lint, unit tests, build" },
            { title: "API tests", detail: "JUnit against H2, when api/ changes" },
            { title: "Terraform plan", detail: "read-only identity, posted as a PR comment" },
            { title: "Staging", detail: "the tested build, deployed to a preview environment" },
            { title: "Staging checks", detail: "smoke test and a real browser", gate: true },
        ],
    },
    {
        heading: "After merge to main",
        steps: [
            { title: "Approval", detail: "only if the Terraform plan has changes", gate: true },
            { title: "Apply", detail: "re-plan, must match what was approved" },
            { title: "Deploy", detail: "site and API, OIDC, no stored credentials" },
            { title: "Live checks", detail: "smoke, browser and Lighthouse gates", gate: true },
        ],
    },
    {
        heading: "On a schedule",
        steps: [
            { title: "Uptime", detail: "about every 15 minutes, opens and closes an issue" },
            { title: "Drift check", detail: "Mondays: fails if Azure no longer matches the code" },
        ],
    },
];

export default function PipelineFlow() {
    return (
        <div className="flow">
            {LANES.map((lane) => (
                <div className="flow-lane" key={lane.heading}>
                    <h3 className="flow-heading">{lane.heading}</h3>
                    <ol className="flow-steps">
                        {lane.steps.map((s) => (
                            <li key={s.title} className={s.gate ? "flow-step flow-gate" : "flow-step"}>
                                <span className="flow-title">{s.title}</span>
                                <span className="flow-detail">{s.detail}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            ))}
        </div>
    );
}
