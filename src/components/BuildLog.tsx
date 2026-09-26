import { useEffect } from "react";
import ApiStatusPanel from "./ApiStatusPanel";
import ArchitectureDiagram from "./ArchitectureDiagram";
import PipelineFlow from "./PipelineFlow";
import SleepTimeline from "./SleepTimeline";

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
];

const SLEEP_STORY: { title: string; body: string }[] = [
  {
    title: "A scheduled job quietly defeated the database's own auto-pause",
    body: "A background retry job queried the database every 15 minutes to catch failed sends. The API is scale-to-zero, and the site's own uptime check pings it about that often, cold-starting a fresh replica each time; Spring's scheduler fires almost immediately on startup with no initial delay, so nearly every cold start touched the database and reset its 60-minute auto-pause timer before it could ever complete. The database ran, and billed, continuously instead of mostly-paused, caught only by reading a cost export. Fixed by retrying at the top of a real contact submission instead of on a timer, which is also the only time the database legitimately needs to be awake.",
  },
  {
    title: "...and that was only half of it",
    body: "The next two cost exports still showed about $7.50 a day, and Azure said the database had never paused once. The API's logs showed about three cold starts an hour, each opening a database connection: startup itself connected, because Flyway ran its migration check and Hibernate validated the schema on every boot. Removing the scheduled job had removed one caller without asking what else connects at startup. Now nothing touches the database until a contact message arrives, and a test counts connections to prove startup and the uptime check open none. It failed on the old code before it passed on the new one. The database paused about an hour after the fix went live, for the first time since it was created.",
  },
];

// Measured from real GitHub Actions runs (the last eight successful runs of each workflow, late September 2026) and the live site.
const CURRENT_NUMBERS: [string, string][] = [
  ["Pull request checks, including staging", "1.5 to 2.5 min"],
  ["Merge to live site, including post-deploy checks", "2.5 to 4 min"],
  ["Upload to Static Web Apps", "~40 s"],
  ["Post-deploy smoke, browser and Lighthouse checks", "~1 min"],
  ["API: tests, image, rollout, database check", "3.5 to 5.5 min"],
  ["Terraform plan, both roots", "~40 s"],
  ["API cold start (first request after scaling to zero)", "~50 s, of which the app's own startup is ~7 s; warm: 0.08 s"],
  ["Lighthouse, mobile / desktop performance", "0.88 to 0.90 / 0.98 to 0.99"],
  ["Lighthouse accessibility, best practices, SEO", "1.00"],
];

const INC002: [string, string][] = [
  ["Detected", "Reading the Azure cost export by hand: $7.74 of database compute on 2026-09-22, the day it was created. No alert, error or failed check fired."],
  ["Impact", "The database never auto-paused and billed around the clock: $18.59 over about two days, on course for roughly $300 a month."],
  ["Cause", "Two things kept connecting: a scheduled retry job, then (after that was fixed) every API startup running Flyway and Hibernate's schema check. The uptime check cold-starts the API about three times an hour, so the database never reached 60 idle minutes."],
  ["Resolved", "2026-09-24 01:28 UTC: the database paused for the first time, 63 minutes after the second fix went live. Next full day: no compute charge at all."],
  ["Prevention", "A test counts database connections through startup, the status check and health checks and fails on any; it failed on the old code first. The deploy now proves the database login works once, with a token only the pipeline has."],
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
    body: "Four YAML mistakes: missing spaces after colons in flow mappings, hostname instead of hostnames, matchLabels beside namespaceSelector instead of inside it, and aks_istio_system instead of aks-istio-system. Also, kubectl apply -f on a directory goes alphabetical, so deployment.yaml ran before namespace.yaml: it only worked because the namespace already existed, and a first deploy to a fresh cluster would have failed. Fixed later with a kustomization.yaml (kubectl apply -k orders Namespaces first), and CI now checks that order on every change, since the lab is only deployed by hand and nothing else would notice.",
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

  // A link like /build#sleep-heading (from the pipeline project's pop-up) should land on that section.
  // The prerendered page already does this on its own; this covers the case where the page was rendered in the browser instead, after the browser had already looked for the anchor.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
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

        <section className="glance" aria-labelledby="glance-heading">
          <h2 id="glance-heading" className="visually-hidden">
            At a glance
          </h2>
          <ul>
            <li>
              <strong>Runs on</strong> Azure: Static Web Apps for the page, a
              Spring Boot API that scales to zero, and a serverless SQL database
              it signs in to without a password. All of it is in Terraform.
            </li>
            <li>
              <strong>Ships through</strong> required checks and a staging
              deploy on every pull request, an approval gate on any
              infrastructure change, and smoke, browser and Lighthouse checks
              against the live site after every deploy.
            </li>
            <li>
              <strong>Costs</strong> about $9 a month now, almost all of it the
              Static Web Apps Standard plan, against roughly $90 a month when it
              ran on Kubernetes.
            </li>
            <li>
              <strong>Best story:</strong>{" "}
              <a href="#inc2-heading">
                the database that never paused
              </a>
              , a real incident found by reading the bill, fixed twice, and
              closed with a test that failed on the old code.
            </li>
          </ul>
        </section>

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

          <h3 className="mt-4">How a change gets there</h3>
          <p className="section-intro mb-0">
            Orange steps are gates: nothing moves past them until they pass,
            or until I approve.
          </p>
          <PipelineFlow />
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

          <h3 id="sleep-heading" className="mt-4">Why the database never slept</h3>
          <Entries items={SLEEP_STORY} />
          <SleepTimeline />
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
              Every pull request deploys to a staging environment first: the
              same build, on a preview URL of the same Static Web App, with the
              smoke test and browser checks run against it, and a pull request
              can&apos;t merge until they pass. The
              production deploy has its own Azure login that only the main
              branch can use.
            </li>
            <li>
              Terraform runs in the pipeline: a read-only plan is posted to
              every pull request, and after merge a change waits for my
              approval before it&apos;s applied. A weekly plan on main fails if
              anything in Azure was changed by hand.
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
            Now: measured from the last eight successful runs of each workflow
            and from the live site.
          </p>
          <dl>
            {CURRENT_NUMBERS.map(([k, v]) => (
              <div className="entry" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-4">On AKS</h3>
          <p className="section-intro mb-3">
            The first version, from a workflow_dispatch run on 2026-09-17.
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

        <section className="band" aria-labelledby="inc2-heading">
          <h2 id="inc2-heading" className="mb-2">
            INC-002: the database that never paused (real)
          </h2>
          <p className="section-intro mb-3">
            A production incident on the current setup, found by reading a
            bill rather than by any alert. The full story is in{" "}
            <a href="#sleep-heading">why the database never slept</a>.
          </p>
          <dl>
            {INC002.map(([k, v]) => (
              <div className="entry" key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <h3>What I&apos;d change</h3>
          <ul>
            <li>
              It was found by hand, days late. Now a $2 monthly budget on the
              API&apos;s resource group, in Terraform, emails me at $1 of actual
              spend (about three months of normal use), so a day like that
              trips it the day it happens; a second alert fires if the
              month&apos;s forecast goes over.
            </li>
            <li>
              The first fix removed the one cause I&apos;d found and stopped
              there. The test that finally closed it checks the property that
              matters (nothing connects unless a message arrives), so the next
              cause fails it too.
            </li>
          </ul>
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
