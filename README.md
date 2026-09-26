# krahler.com

![deploy](https://github.com/EliothK/krahler/actions/workflows/deploy.yml/badge.svg)

My portfolio site, and the infrastructure and pipeline it ships through: a React single-page app on Azure Static Web Apps, a Spring Boot API on a scale-to-zero Container App, and an Azure SQL database behind the contact form, all deployed by GitHub Actions. It ran on Kubernetes (AKS) first; that setup is kept in [lab/](lab/) as an on-demand lab, and the [build log](https://krahler.com/build) covers both chapters.

## Stack

| Layer                  | Tech                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend               | React 19, TypeScript, Vite (prerendered HTML), SCSS, Bootstrap 5                                                                                                                                                                                                                                                         |
| Site hosting           | Azure Static Web Apps (Standard tier), managed TLS, `krahler.com` and `www` behind Cloudflare DNS, plus a `staging` preview environment                                                                                                                                                                                  |
| API                    | Spring Boot 4.1 / Java 25, Azure Container Apps (Consumption, scale-to-zero), its own managed TLS certificate at `api.krahler.com`. Also proxies GitHub for the site's activity feed (server-side token, cached) so visitors don't share GitHub's unauthenticated rate limit.                                            |
| Database               | Azure SQL, serverless with auto-pause, Spring Data JPA + Flyway migrations; passwordless (the API signs in with its managed identity)                                                                                                                                                                                    |
| Infrastructure as code | Terraform 1.15 (AzureRM backend, remote state), separate roots for the site, the API (+ database), and the lab; planned on every PR, applied after approval                                                                                                                                                              |
| CI/CD                  | GitHub Actions, OIDC login to Azure (no stored credentials)                                                                                                                                                                                                                                                              |
| Tests / checks         | Vitest + Testing Library (site), JUnit 5 (API), ESLint, `npm audit`/`mvn`, post-deploy smoke test, real-browser check (playwright-core), Lighthouse gate, a deploy-time database check, a CI check that the lab's Kubernetes manifests apply Namespaces first, scheduled uptime check covering both the site and the API |
| Supply chain           | Pinned action SHAs, Dependabot (npm, Maven, Actions, Docker, Terraform); the Java version (25) is kept in step by hand across `pom.xml`, both Dockerfile stages and CI, since Dependabot once bumped only one of them                                                                                                    |
| Cost                   | About $9 a month, almost all of it the Static Web Apps Standard plan (about $90 a month when it ran on AKS). A $50 subscription budget and a $2 budget on the API's resource group email on overspend                                                                                                                    |

## Run it locally

```bash
cp .env.example .env      # set VITE_GITHUB_USER and VITE_CONTACT_EMAIL
npm ci
npm run dev               # http://localhost:5173
```

| Command                                            | What it does                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                      | Dev server with hot reload                                                                                                                                                |
| `npm run build`                                    | Type-check and production build into `dist/`                                                                                                                              |
| `npm run lint`                                     | ESLint                                                                                                                                                                    |
| `npm test`                                         | Unit tests (Vitest), no network                                                                                                                                           |
| `SMOKE_URL=https://krahler.com npm run smoke`      | Live-site checks: status codes, a real 404 for unknown paths, security headers, caching, compression, TLS expiry                                                          |
| `SMOKE_URL=https://krahler.com npm run browser`    | Checks that need a real browser engine, e.g. the reading-progress bar tracking the scroll (uses an installed Chromium-based browser; set `CHROME_PATH` if it isn't found) |
| `SMOKE_URL=https://krahler.com npm run lighthouse` | Lighthouse score thresholds, mobile and desktop (needs a Chromium-based browser)                                                                                          |

Any of the `SMOKE_URL` checks can run against a local production build: `npm run build && npx vite preview`, then `SMOKE_URL=http://localhost:4173`. The header, TLS and caching checks in `smoke` only pass against the real host.

## Project layout

```
src/components/        React sections (profile, projects, experience, skills, contact, build log, ...) and the build log's diagrams (architecture, pipeline flow, database sleep timeline)
src/scripts/           data, GitHub activity helpers, the API client
src/test/              unit tests, mirrored to src/
smoke/                 live-site checks (smoke test, browser check, Lighthouse gate)
scss/                  styles; the crow palette tokens are at the top of _site.scss
public/                static files: staticwebapp.config.json (headers, caching, the 404 page), the share image and the résumé PDF
scripts/               prerender.mjs (SSR at build time: /, /build, one page per project at /projects/<id>, and 404.html), activity-snapshot.mjs (build-time GitHub fetch)
terraform/             site infra: Static Web App, domains, deploy role, budget (state: site.tfstate)
api/                   the Spring Boot API: src/, its Dockerfile, and api/terraform/ (Container App, Azure SQL, cost alert; state: api.tfstate)
lab/                   the AKS lab: terraform/, k8s/ (applied with kubectl apply -k), Dockerfile, nginx config. See lab/README.md
.github/workflows/     deploy.yml (site + staging), api.yml (API: test, publish, deploy), infrastructure.yml (Terraform plan / approved apply / drift), uptime.yml, lab-deploy.yml
```

## How it ships

**Site** (`deploy.yml`):

1. **Pull request:** `ci` (audit, lint, tests, build) and `terraform` (`fmt` and `validate` on all three Terraform roots), then `staging`: the build `ci` produced is deployed to a fixed preview environment, [staging](https://orange-river-067e6cd10-staging.centralus.6.azurestaticapps.net), and the smoke test and browser checks run against it. Production is untouched, and `ci`, `terraform` and `staging` are required checks, so a PR can't merge until staging passes. Dependabot and fork PRs skip staging (no secrets), which counts as passing.
2. **Push to `main`:** the same checks, then the exact build that passed CI is deployed to Static Web Apps. The pipeline logs in with OIDC and reads the deployment token from Azure at run time, so no long-lived secret is stored in GitHub.
3. **After each deploy:** a smoke test, a real-browser check and a Lighthouse gate run against `https://krahler.com`. A failure fails the pipeline (the site is already live by then; the red run is the alert).

**API** (`api.yml`, only runs when `api/` changes):

1. `mvn verify` (JUnit 5) and a container image build.
2. On push to `main`: the image is published to `ghcr.io`, rolled out to the Container App with `az containerapp update`, then the pipeline polls `/api/status` until it reports the new commit: proving the _live_ app is running the new code, not just that the image was pushed.
3. Because nothing connects to the database at startup, a running app doesn't prove the database login works. So the pipeline then calls `POST /api/deploy-check` with a token only it has; the new version runs the migration and a query, and a failure fails the deploy instead of a visitor's first message. Without the token the endpoint answers 404, so it can't be used to keep the database awake.

**Infrastructure** (`infrastructure.yml`, the site and API Terraform roots; the lab stays manual):

1. **Pull request:** a read-only identity runs `terraform plan` on both roots and posts the result as one PR comment, updated on every push. A change the PR didn't intend means someone changed Azure by hand.
2. **Push to `main`:** plan again. A root with changes waits for the owner's approval in the `infrastructure` environment, then re-plans, checks the plan still matches the approved one (a hash of the changed addresses and actions), and applies. No changes, no approval needed.
3. **Weekly, and on demand:** a drift check that fails if Azure no longer matches `main`.

**Uptime** (`uptime.yml`), roughly every 15 minutes off-peak: the site smoke test against both hostnames, plus a health check against `api.krahler.com` that tolerates its cold start. A failure opens a GitHub issue; recovery closes it.

## Security notes

- Security headers (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer-Policy, Permissions-Policy) and caching rules are set in `public/staticwebapp.config.json`, and the smoke test asserts them on the live site. CSP's `connect-src` explicitly allow-lists `api.krahler.com`.
- The API only accepts requests from `krahler.com`/`www.krahler.com` (CORS), rate-limits `/api/contact` to 5 requests/hour based on the real client IP (the rightmost entry of `X-Forwarded-For`, since Azure Container Apps appends rather than replaces it: anything to its left is caller-supplied), validates all input including a line-break check on the sender name (closes an email header injection path), and rejects a honeypot field a real visitor never fills in.
- Azure access uses OIDC federated credentials scoped to GitHub environments: `production` and `infrastructure`, which only the `main` branch can use (`infrastructure` also needs the owner's approval), and `staging`, used by pull requests. The deploy identity has Contributor on the site and API resource groups only, plus subscription-wide Reader and Cost Management Contributor (for the budget); nothing else can change Azure.
- The API's CORS list (`API_ALLOWED_ORIGINS`) is set by `api.yml` on every deploy: `krahler.com`, `www`, and the exact staging origin. Terraform only sets it at creation.
- Staging shares the production API and database, so a contact-form message sent from staging is real.
- The API opens no database connection at startup or for status and health checks; Flyway migrates on the first contact submission, or on the deploy check. That's what lets serverless Azure SQL auto-pause while the uptime check keeps cold-starting the API, and `NoDatabaseAtStartupTest` enforces it.
- Outgoing mail has 5-second connect, read and write timeouts, so a slow Gmail can't hold a visitor's request open; the message is saved first and a failed send is retried on the next submission.
- There is no database password. Azure SQL accepts Entra sign-in only, and the API connects as its Container App's managed identity (`authentication=ActiveDirectoryManagedIdentity`).
- Mail credentials, the GitHub activity token and the deploy check token are Container App secrets, never plain env vars, and are refreshed on every API deploy.
- Unknown paths get a real 404 page (`404.html`, marked noindex) instead of the home page with a 200.
- Terraform plans run as a separate identity that can read Azure (including the secrets the provider refreshes, all of which are already in state) but can't change it; applies run as the deploy identity, only from `main`, only after approval. Plan files are never uploaded as artifacts, since they can carry secret values in clear text; plan text is public, with sensitive values redacted.
- Terraform state is remote. Secrets, state, plans, and `.tfvars` are git-ignored.
- The site, the API (with its database), and the lab each have separate Terraform state, so applying or destroying any one of them can never touch the others.

The [build log](https://krahler.com/build) tells the story behind all of this, including what broke along the way.

## Roadmap

The API, database, staging environment, Terraform pipeline and the before-and-after cost are done; the build log's INC-002 covers the one real incident so far. Each project write-up also has its own prerendered page (for example [krahler.com/projects/solarcast](https://krahler.com/projects/solarcast)), so a single write-up can be linked on its own.

## License

The code is [MIT licensed](LICENSE). The bio, experience and personal photos are by Elioth Krahler; please don't reuse them without permission.
