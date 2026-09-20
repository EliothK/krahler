import { useEffect } from "react";

const REPO = "https://github.com/EliothK/krahler";

const NUMBERS: [string, string][] = [
    ["Dispatch to done", "~1m38s"],
    ["ci / terraform / deploy", "39s / 9s / 53s"],
    ["Rollout, 2 replicas", "~5s"],
    ["Image in ACR (compressed)", "~25.3 MB"],
    ["Image local (uncompressed)", "63.2 MB"],
];

const DECISIONS: { title: string; body: string }[] = [
    {
        title: "Rootless, non-root, small",
        body: "Podman builds the image locally: rootless, no daemon. The serve stage is nginx-unprivileged, so the container runs as UID 101 on port 8080. The image is 63 MB, over my 50 MB target. Both Alpine nginx bases have grown past 50 MB upstream, so I kept the number and dropped the target. The multi-stage build still keeps Node and node_modules out of the final image.",
    },
    {
        title: "Security headers that actually apply",
        body: "nginx's add_header doesn't accumulate. The /assets/ location sets its own Cache-Control, which silently dropped every inherited security header. The headers now live in one snippet, included explicitly in both locations, and I checked both with curl.",
    },
    {
        title: "OIDC scoped to an environment",
        body: "No stored Azure credential. The federated credential subject is repo:EliothK/krahler:environment:production, so GitHub only mints a token once the production environment's rules are satisfied. That is stricter than \"anything running on main\".",
    },
    {
        title: "Cheap on purpose",
        body: "Free-tier AKS control plane, one Standard_D2as_v6 node, and a nightly-scale workflow that runs az aks stop at 10pm Central and az aks start at 5am, so the site is deliberately offline overnight. It fires at both possible UTC hours and checks the real local hour, so daylight saving needs no cron edits. A $50 subscription budget alerts at 80%.",
    },
    {
        title: "Deploy by digest, gate on rollout",
        body: "Trivy scans (HIGH/CRITICAL, unfixed vulnerabilities ignored) before push, provenance is attested, and the deploy pins @sha256 rather than the mutable SHA tag. Branch protection on main requires the ci and terraform checks, but no reviewers: self-review on a one-person repo is theatre, while required checks make \"tests gate main\" structurally true.",
    },
];

const BROKE: { title: string; body: string }[] = [
    {
        title: "Manifests never apply-tested",
        body: "Four YAML mistakes: missing spaces after colons in flow mappings, hostname instead of hostnames, matchLabels beside namespaceSelector instead of inside it, and aks_istio_system instead of aks-istio-system. Also, kubectl apply -f on a directory goes alphabetical, so deployment.yaml runs before namespace.yaml. That one is still unfixed: it works only because the namespace already exists, and a first deploy to a fresh cluster would fail.",
    },
    {
        title: "Dependabot never gets secrets",
        body: "Even on same-repo PRs. The terraform job failed with an OIDC error that never mentioned secrets. Now the real backend init runs only on push, and PRs use init -backend=false.",
    },
    {
        title: "A grouped bump split React from react-dom",
        body: "react went to 19.3.0 while react-dom stayed on 19.2.8, and every component test failed with \"Incompatible React versions.\" A green Dependabot check proves one package installs, not that its siblings still match.",
    },
    {
        title: "Failure paths, on purpose",
        body: "An always-false test left ci red and deploy skipped. A nonexistent image digest left the new pod in ImagePullBackOff while both old pods kept serving, then rollout status timed out and failed the job. A pipeline that can't go red says nothing.",
    },
];

const INCIDENT: { title: string; body: string }[] = [
    {
        title: "Monitoring caught a real outage first",
        body: "Within minutes of enabling the availability test, every check failed to resolve krahler.com. The domain had no DNS records at all. Cloudflare was set to DNS-only so cert-manager's HTTP-01 challenge could reach the cluster.",
    },
    {
        title: "cert-manager was never in code",
        body: "It had been installed by hand and lost to a nightly terraform destroy (the nightly job has since become a cluster stop/start). It also ignores Gateway resources unless config.enableGatewayAPI is set. Now it and the ClusterIssuers are in Terraform.",
    },
    {
        title: "The gateway wasn't on the static IP",
        body: "AKS gave the Gateway a random IP while DNS pointed at the static one. Two annotations on the Gateway pin it, including the resource group, since the IP deliberately lives outside the destroyed one.",
    },
    {
        title: "Pod Security vs. Azure's own pods",
        body: "The restricted policy on the portfolio namespace rejected AKS App Routing's managed gateway pods, which don't set a seccomp profile. I moved the Gateway to its own namespace instead of relaxing the policy on the app's.",
    },
    {
        title: "Container Insights dropped every log for two hours",
        body: "Terraform's oms_agent block doesn't create the Data Collection Rule the portal's Enable button does. The agent showed 3/3 Running and wrote nothing. Provider registration for Microsoft.Insights raced the same way. In both cases, terraform apply going green told me nothing.",
    },
    {
        title: "The first real KQL found a third problem",
        body: "istiod was Pending and the gateway proxy crashlooping: 1 Insufficient cpu on a single 2 vCPU node at 83% requested. Scaling to two nodes fixed it. The cluster has since gone back to one, to save cost, with that risk known.",
    },
];

const INC001: [string, string][] = [
    ["Detected", "05:44 UTC, 3 of 3 regions failing (original 3-region setup)"],
    ["Resolved", "~05:58 UTC"],
    ["Time to detect / resolve", "~6 min / ~18.5 min"],
    ["Cause", "Deliberate: deployment scaled to 0 replicas"],
];

type Item = { title: string; body: string };

function Entries({ items }: { items: Item[] }) {
    return (
        <>
            {items.map((i) => (
                <div className="entry" key={i.title}>
                    <h3>{i.title}</h3>
                    <p>{i.body}</p>
                </div>
            ))}
        </>
    );
}

export default function BuildLog() {
    useEffect(() => {
        const previous = document.title;
        document.title = "Build log - Elioth Krahler";
        return () => {
            document.title = previous;
        };
    }, []);

    return (
        <div className="container-xl py-4 py-lg-5">
            <main id="main">
                <p className="mb-3">
                    <a href="/">Back to the portfolio</a>
                </p>
                <header className="pb-4">
                    <h1 className="lede mb-3">Build log</h1>
                    <p className="quiet lede-sub">
                        How this site ships: GitHub Actions deploys the app to
                        AKS; Terraform is validated in CI and applied by hand.
                        Includes what broke along the way. Numbers come from real
                        runs, not estimates. Source:{" "}
                        <a href={`${REPO}/blob/main/.github/workflows/deploy.yml`}>
                            the workflow
                        </a>{" "}
                        and{" "}
                        <a href={`${REPO}/tree/main/terraform`}>the Terraform</a>.
                    </p>
                </header>

                <section className="band" aria-labelledby="numbers-heading">
                    <h2 id="numbers-heading" className="mb-2">
                        Numbers
                    </h2>
                    <p className="section-intro mb-3">
                        From a workflow_dispatch run on 2026-09-17.
                    </p>
                    <dl>
                        {NUMBERS.map(([k, v]) => (
                            <div className="entry" key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="band" aria-labelledby="decisions-heading">
                    <h2 id="decisions-heading" className="mb-2">
                        Decisions
                    </h2>
                    <Entries items={DECISIONS} />
                </section>

                <section className="band" aria-labelledby="broke-heading">
                    <h2 id="broke-heading" className="mb-2">
                        What broke in the pipeline
                    </h2>
                    <Entries items={BROKE} />
                </section>

                <section className="band" aria-labelledby="monitoring-heading">
                    <h2 id="monitoring-heading" className="mb-2">
                        Adding monitoring, and what it found
                    </h2>
                    <p className="section-intro mb-3">
                        None of this was staged. Each fix made room to see the
                        next problem.
                    </p>
                    <Entries items={INCIDENT} />
                </section>

                <section className="band" aria-labelledby="inc-heading">
                    <h2 id="inc-heading" className="mb-2">
                        INC-001: krahler.com unavailable (simulated)
                    </h2>
                    <p className="section-intro mb-3">
                        Run against a baseline I already knew was healthy. An
                        alert only proves something if it fires on that.
                    </p>
                    <dl>
                        {INC001.map(([k, v]) => (
                            <div className="entry" key={k}>
                                <dt>{k}</dt>
                                <dd>{v}</dd>
                            </div>
                        ))}
                    </dl>
                    <h3>What I'd change</h3>
                    <ul>
                        <li>
                            Detection is bounded by the test frequency and the
                            alert window. The incident ran with 5-minute
                            values across 3 regions; the current config is 2
                            regions, a 15-minute test interval, a 15-minute
                            window and an alert at 2 failed locations, so
                            detection is slower now. Tightening either costs
                            more, so it is a trade, not a free fix.
                        </li>
                        <li>
                            The nightly stop makes the site unavailable
                            overnight by design, which the availability test
                            will report as a failure.
                        </li>
                        <li>
                            Nothing alerts on someone scaling the Deployment to
                            zero, other than the external availability test
                            eventually noticing.
                        </li>
                    </ul>
                </section>
            </main>
        </div>
    );
}
