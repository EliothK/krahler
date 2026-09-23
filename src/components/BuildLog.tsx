import { useEffect } from "react";
import ApiStatusPanel from "./ApiStatusPanel";
import ArchitectureDiagram from "./ArchitectureDiagram";

const REPO = "https://github.com/EliothK/krahler";

const API_CHAPTER: { title: string; body: string }[] = [
  {
    title: "Durable by design, not by luck",
    body: "A contact-form message is saved to Azure SQL before the notification email is even attempted. A failed send (an expired app password, Gmail throttling) used to lose the message silently; now the row survives, and the next real submission sweeps any still-unemailed row and retries it.",
  },
  {
    title: "A secret rotation that silently didn't take effect",
    body: 'az containerapp update --set-env-vars uses identical literal text on every deploy, including "secretref:name" references. A workflow_dispatch rerun of the same commit, done purely to rotate a password, changes nothing else in the spec, so Azure sees no diff and skips the restart. Three password regenerations had zero effect before this was found. Fixed by adding DEPLOY_RUN_ID, the GitHub Actions run ID, as an env var: guaranteed to differ on every run, so the container is guaranteed to actually restart.',
  },
  {
    title: "Spring Boot 4 moved Flyway into its own starter",
    body: "flyway-core plus flyway-sqlserver sat on the classpath completely unused after the database phase's first deploy: no error, no log line, just a schema that never got created. Spring Boot 4 split Flyway's autoconfiguration into spring-boot-starter-flyway, the same restructuring pattern already hit once with the test starter. The fix is a one-line dependency swap; finding it took grepping a startup log for the word \"Flyway\" and getting nothing.",
  },
  {
    title: "H2 tests can't catch SQL-Server-specific behavior",
    body: "Two real bugs shipped past a fully green test suite because tests ran against H2 instead of the real database: the Flyway bug above, and java.time.Instant mapping to an offset-aware SQL type on SQL Server that H2 is permissive about. Both fixed, and tests now run the actual Flyway migration against H2 in SQL Server compatibility mode instead of letting Hibernate build the schema itself, which is what should have caught the first bug originally.",
  },
  {
    title: "A security review found two live bugs, not theoretical ones",
    body: 'The contact form\'s "name" field flowed unvalidated into the notification email\'s Subject header, an email header injection gap, fixed with a line-break check. Separately, the rate limiter read the first (client-controlled) entry of X-Forwarded-For as the real client IP; Azure Container Apps appends the real IP rather than replacing the header, so a caller could defeat the 5-per-hour limit outright by sending a different fake value every request. Confirmed against Microsoft\'s own ingress docs before fixing it, since the intuitive assumption turned out to be backwards.',
  },
  {
    title: "A scheduled job quietly defeated the database's own auto-pause",
    body: "A background retry job queried the database every 15 minutes to catch failed sends. The API is scale-to-zero, and the site's own uptime check pings it about that often, cold-starting a fresh replica each time; Spring's scheduler fires almost immediately on startup with no initial delay, so nearly every cold start touched the database and reset its 60-minute auto-pause timer before it could ever complete. The database ran, and billed, continuously instead of mostly-paused, caught only by reading a cost export. Fixed by retrying at the top of a real contact submission instead of on a timer, which is also the only time the database legitimately needs to be awake.",
  },
];

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
    body: 'No stored Azure credential. The federated credential subject is repo:EliothK/krahler:environment:production, so GitHub only mints a token once the production environment\'s rules are satisfied. That is stricter than "anything running on main".',
  },
  {
    title: "Cheap on purpose",
    body: "On AKS: free-tier control plane, one Standard_D2as_v6 node, and a nightly-scale workflow that ran az aks stop at 10pm Central and az aks start at 5am, so the site was deliberately offline overnight. It fired at both possible UTC hours and checked the real local hour, so daylight saving needed no cron edits. That workflow is retired now that the site is on Static Web Apps. The $50 subscription budget, alerting at 80%, is still in place.",
  },
  {
    title: "Deploy by digest, gate on rollout",
    body: 'Trivy scans (HIGH/CRITICAL, unfixed vulnerabilities ignored) before push, provenance is attested, and the deploy pins @sha256 rather than the mutable SHA tag. Branch protection on main requires the ci and terraform checks, but no reviewers: self-review on a one-person repo is theatre, while required checks make "tests gate main" structurally true.',
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
    body: 'react went to 19.3.0 while react-dom stayed on 19.2.8, and every component test failed with "Incompatible React versions." A green Dependabot check proves one package installs, not that its siblings still match.',
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
            How this site ships: GitHub Actions deploys it to Azure Static Web
            Apps and a Spring Boot API on a Container App, with an Azure SQL
            database behind the contact form. It ran on Kubernetes (AKS)
            first; that chapter is further down, what I built, what broke,
            and what I learned before moving it to static hosting. The
            AKS-era numbers come from real runs, not estimates.
            Source:{" "}
            <a
              href={`${REPO}/blob/main/.github/workflows/deploy.yml`}
              target="_blank"
              rel="noopener noreferrer"
            >
              the workflow
            </a>{" "}
            and{" "}
            <a
              href={`${REPO}/tree/main/terraform`}
              target="_blank"
              rel="noopener noreferrer"
            >
              the Terraform
            </a>
            .
          </p>
        </header>

        <section className="band" aria-labelledby="arch-heading">
          <h2 id="arch-heading" className="mb-2">
            How it&apos;s built now
          </h2>
          <p className="section-intro mb-3">
            A visitor&apos;s browser talks to two things: Static Web Apps for
            the page itself, and a Spring Boot API on its own Container App
            for the contact form and the GitHub activity feed. The API is the
            only thing that talks to the database, and it scales to zero (and
            the database auto-pauses) when nobody&apos;s using either.
            GitHub Actions deploys all three, authenticating to Azure with
            OIDC rather than a stored credential.
          </p>
          <ArchitectureDiagram />
        </section>

        <ApiStatusPanel />

        <section className="band" aria-labelledby="api-chapter-heading">
          <h2 id="api-chapter-heading" className="mb-2">
            Building the API and database
          </h2>
          <p className="section-intro mb-3">
            The newest chapter: a real backend, a real database, and the
            incidents that came with both. None of this was staged.
          </p>
          <Entries items={API_CHAPTER} />
        </section>

        <section className="band" aria-labelledby="moved-heading">
          <h2 id="moved-heading" className="mb-2">
            Why it moved off AKS
          </h2>
          <p className="section-intro mb-3">
            The Kubernetes setup did what I built it to do: prove a whole
            delivery path, end to end, with no stored secrets. It was also more
            than a one-page static site needs, and it cost real money to keep
            up.
          </p>
          <ul>
            <li>
              Stopping the node overnight still left the load balancer, public
              IP and container registry billing around the clock, about a
              dollar a day on the Azure cost export, before the node itself.
            </li>
            <li>
              The site was offline from 10pm to 5am Central by design, and the
              availability test reported that as a failure every night.
            </li>
            <li>
              Static Web Apps on the free tier costs nothing, serves from a
              CDN, and terminates TLS for me. Lighthouse on the default URL,
              mobile emulation: performance 0.91, accessibility, best
              practices and SEO all 1.00. Desktop performance 0.99.
            </li>
            <li>
              I also want a real backend on this site, and a serverless API
              behind static hosting is the cheaper way to get one.
            </li>
          </ul>
          <h3>What changed in the pipeline</h3>
          <ul>
            <li>
              Trivy scanning and build provenance were about the container
              image, so they went with it. The checks that replace them run on
              every change: dependency audit, lint, unit tests, a build, and
              Terraform validation. After each deploy, a smoke test checks the
              live site&apos;s status codes, security headers and caching, a
              real browser scrolls the page to check behaviour jsdom can&apos;t
              see, and a Lighthouse run has to clear score thresholds.
            </li>
            <li>
              The Azure availability test stayed with the AKS lab. The live
              site is watched by a scheduled GitHub Actions workflow instead:
              about every 15 minutes it smoke-tests both hostnames and the
              API&apos;s health, opens an issue when something fails and closes
              it on recovery.
            </li>
            <li>
              The Kubernetes and Terraform setup was not thrown away. It is
              kept in the repo as a lab I can bring up and tear down on demand,
              with its own Terraform state, so it can never take the public
              site down.
            </li>
          </ul>
        </section>

        <section className="band" aria-labelledby="numbers-heading">
          <h2 id="numbers-heading" className="mb-2">
            Numbers
          </h2>
          <p className="section-intro mb-3">
            AKS-era pipeline, from a workflow_dispatch run on 2026-09-17.
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
            None of this was staged. Each fix made room to see the next problem.
          </p>
          <Entries items={INCIDENT} />
        </section>

        <section className="band" aria-labelledby="inc-heading">
          <h2 id="inc-heading" className="mb-2">
            INC-001: krahler.com unavailable (simulated)
          </h2>
          <p className="section-intro mb-3">
            Run against a baseline I already knew was healthy. An alert only
            proves something if it fires on that.
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
              Detection is bounded by the test frequency and the alert window.
              The incident ran with 5-minute values across 3 regions; the
              lab&apos;s current config is 2 regions, a 15-minute test interval, a
              15-minute window and an alert at 2 failed locations, so detection
              is slower now. Tightening either costs more, so it is a trade, not
              a free fix.
            </li>
            <li>
              The nightly stop made the site unavailable overnight by design,
              which the availability test reported as a failure every night.
              That went away with the move to Static Web Apps.
            </li>
            <li>
              Nothing alerts on someone scaling the Deployment to zero, other
              than the external availability test eventually noticing.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
