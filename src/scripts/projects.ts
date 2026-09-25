export type Project = {
    id: string;
    title: string;
    stack: string;
    /** One line, visible on the card without opening anything. */
    summary: string;
    /** The measured number. `null` means "not measured yet" - say so, don't invent one. */
    figure: string | null;
    figureAccent: "solar" | "flux";
    /** Shown in place of `figure` while it's unmeasured. */
    figurePending?: string;
    figureLabel: string;
    /** Dialog sections. Arrays of paragraphs. */
    program: string[];
    autopsy: string[];
    next: string[];
    links?: { label: string; href: string }[];
};

export const PROJECTS: Project[] = [
    {
        id: "pipeline",
        title: "This site's delivery pipeline",
        stack: "GitHub Actions · Terraform · Static Web Apps · Container Apps · Azure SQL · AKS (first version)",
        summary:
            "Commit to production with no manual steps and no long-lived secret. It started on Kubernetes and moved to static hosting with a scale-to-zero API once the cost stopped making sense.",
        figure: null,
        figureAccent: "flux",
        figurePending: "cost comparison pending",
        figureLabel: "measured monthly cost, AKS versus Static Web Apps, once the cutover is done",
        program: [
            "Ship this React site with no manual steps and no long-lived secrets, on a small budget. The first version ran on Azure Kubernetes Service: a free-tier control plane, one node, and the node stopped overnight by a scheduled workflow. The current version serves the page from Azure Static Web Apps, with a Spring Boot API on Azure Container Apps and an Azure SQL database behind the contact form. The API scales to zero and the database auto-pauses when nobody is using them.",
            "The parts that carried over: OIDC workload identity federation instead of a long-lived service principal secret, scoped to the production environment, so there is no secret to leak or rotate. Terraform state in Azure Storage, because a runner is a fresh machine every time and local state would not survive it. CI runs lint, tests, a build, and terraform fmt and validate on every change, and the API's Maven tests on every API change; infrastructure itself is applied by hand, not by the pipeline. After each deploy, a smoke test, a real-browser check and a Lighthouse score gate run against the live site. The parts that were about the container and went with it: a multi-stage image, images tagged by commit SHA and deployed by digest, Trivy scanning and build-provenance attestation.",
        ],
        autopsy: [
            "AKS-era numbers, from a real workflow_dispatch run: about 1m38s from dispatch to done. ci 39s, terraform (fmt and validate only) 9s, deploy 53s, and the rollout itself about 5s across two replicas with maxUnavailable 0. The image was 63 MB locally, over my 50 MB target. Both Alpine nginx bases have grown past that upstream, so I kept the number and dropped the target.",
            "I tested the failure paths on purpose. An always-false test left ci red and deploy skipped. A nonexistent image digest left the new pod in ImagePullBackOff while both old pods kept serving, and rollout status failed the job. A green pipeline that can't go red says nothing.",
            "Monitoring then caught a real outage before my planned test did. krahler.com had no DNS records, cert-manager had been installed by hand and lost to a nightly destroy, and the restricted Pod Security policy blocked AKS's own gateway pods. The fix was moving the Gateway into its own namespace, not weakening the policy on the app's. Container Insights also dropped every log line for two hours because Terraform doesn't create the Data Collection Rule the portal does. Terraform applying cleanly told me nothing about either.",
            "On Static Web Apps, Lighthouse (mobile emulation) scores 0.88-0.90 for performance and 1.00 for accessibility, best practices and SEO; desktop performance is 0.98-0.99. It took two rounds: a 404 on a file the code still requested cost best-practices points, and the profile photo was the heaviest thing on the page.",
            "A redesign later dropped mobile performance to 0.82 and the deploy's Lighthouse gate failed, which is the point of having one. The cause was a photo preload that ran before the browser knew the screen size, so phones downloaded the photo twice at the wrong size, plus fonts only found after the CSS loaded. A fading card animation had also cost accessibility points, because Lighthouse measured the text mid-fade.",
        ],
        next: [
            "Kubernetes was more than a one-page static site needs, and I'd rather say so than pretend otherwise. The point of the first version was to build the delivery path properly, not to right-size the workload. Even with the node stopped overnight, the load balancer, public IP and registry billed around the clock, and the site was dark from 10pm to 5am. Moving to static hosting removed both problems. The AKS setup is kept in the repo as a lab I can bring up and tear down, with its own Terraform state.",
            "Staging now exists: every pull request deploys the exact build CI tested to a staging environment on the same Static Web App, and the smoke test and browser checks run there; a pull request can't merge until they pass. The production deploy gets its own login, which only the main branch can use.",
            "Terraform is in the pipeline too. Every pull request gets a plan comment from an identity that can read Azure but not change it. After merge, a change waits for my approval, then re-plans and applies only if the plan still matches what I approved. A weekly run fails if Azure has drifted from the code, which is how a hand-made change would get caught.",
            "There is no database password anywhere. The API signs in to Azure SQL as its Container App's managed identity, and password sign-in is switched off on the server, so there's nothing in GitHub, the container's secrets or the Terraform state to leak or rotate.",
            "Still under-engineered: staging shares the production API and database, so a contact-form test from staging is a real message. A separate staging API and database is next.",
        ],
        links: [
            { label: "The workflow", href: "https://github.com/EliothK/krahler/blob/main/.github/workflows/deploy.yml" },
            { label: "The Terraform", href: "https://github.com/EliothK/krahler/tree/main/terraform" },
            { label: "Full build log", href: "/build" },
        ],
    },
    {
        id: "solarcast",
        title: "SolarCast",
        stack: "Python · XGBoost · TensorFlow · Optuna · Keras Tuner · pytest in CI · on-prem Linux + NVIDIA GPU",
        summary:
            "Solar irradiance forecasts 6 to 48 hours ahead that correct a live weather forecast against satellite measurements, and beat that forecast at every horizon.",
        figure: "58–59 W/m²",
        figureAccent: "solar",
        figureLabel: "test RMSE of the XGBoost + LSTM ensemble, 6h to 48h ahead, against 60–78 W/m² for the Open-Meteo forecast alone",
        program: [
            "Forecast Global Horizontal Irradiance (GHI) for a generation site. The first version learned only from 24 hours of NSRDB satellite history, which isn't available in real time, so the live script had to feed it Open-Meteo data it was never trained on. The rebuild uses the same kind of input in training and live: Open-Meteo's historical-forecast and previous-runs archives, with NSRDB used only as the truth to learn against.",
            "The models predict the clear-sky index (GHI divided by clear-sky GHI) from the last 24 hours of weather, the forecast around the target hour, and the exact sun position, which removes the daily and seasonal cycle they would otherwise spend their capacity on. XGBoost and an LSTM are combined per horizon, weighted by inverse validation error. Splits are time-ordered with a 48-hour gap at each boundary, and the 24h and 48h models are scored on forecasts really issued one and two days earlier. The notebooks became a tested Python package: run_pipeline.py downloads, tunes (Optuna and Keras Tuner), trains and evaluates a site from a latitude and longitude; predict_today.py forecasts live and refuses to run models trained for a different site. The pytest suite runs offline in GitHub Actions. This is a portfolio project, not a production deployment.",
        ],
        autopsy: [
            "On held-out 2024 data at Bismarck, ND, the ensemble scores 59.1, 59.4, 58.0 and 59.2 W/m² RMSE at 6, 12, 24 and 48 hours (R² 0.92 to 0.94). The Open-Meteo forecast alone scores 77.9, 77.9, 60.5 and 68.7. The old model, run the way the old live script actually ran it, scored 98 to 103 at 6h and 12h.",
            "The gain is not even. At 6h and 12h the ensemble cuts the forecast's error by about 24%; at 24h it is only 4%, close to noise. The 24h and 48h rows cover August to December 2024 only, and the 6h and 12h rows use the newest forecast run for each hour, so live error will be somewhat higher.",
            "The long range got an honest baseline and lost to it. Daily models from 7 days to 48 weeks do no better than a day-of-year climatology average (both around 1,320-1,380 Wh/m² per day RMSE). The first version reported those models without that comparison. Prophet was dropped from the short range, where it scored 75% worse than XGBoost.",
        ],
        next: [
            "There's still no automated retraining and no drift detection. I'd add a scheduled retrain with a hold-out check and log live forecasts against later NSRDB data, which would also measure the real live error the archive can only estimate.",
            "The long-range models should either beat climatology or be replaced by it. And every number here comes from one site; the pipeline takes any latitude and longitude, but I haven't yet shown the gain holds at a second one.",
        ],
        links: [
            { label: "Source", href: "https://github.com/EliothK/SolarCast" },
        ],
    },
    {
        id: "neutro",
        title: "NeutroSurrogate",
        stack: "Python · PyTorch · SciPy · Optuna · finite volume · pytest in CI",
        summary:
            "A neural surrogate for one-group neutron diffusion in a multi-zone slab reactor, with a physics step that turns its flux into k-eff accurate to a few pcm without calling the solver.",
        figure: "1.5–2.3 pcm",
        figureAccent: "flux",
        figureLabel: "k-eff RMSE on the test split with the Rayleigh-Ritz re-fit (M = 17), no solver calls, about 25x faster than the solver in batches",
        program: [
            "Reactor design sweeps need the effective multiplication factor (k-eff) and the flux profile thousands of times over, and the eigenvalue solve is the bottleneck. A bare uniform slab has a closed-form solution, so the geometry is multi-zone: 16 zones over 192 cells, each with its own diffusion coefficient, absorption and fission production, plus the slab width, a 49-dimensional input. Properties are drawn at five knots and interpolated, because fully independent zones made the eigenvalue nearly unlearnable.",
            "I wrote the finite-volume solver from scratch and cross-checked it before training anything on it: the uniform case matches analytic bare-slab theory to under 1 pcm and converges at second order, and ARPACK agrees with an independent power-iteration solver. A surrogate fitted to a buggy solver learns the bug perfectly. Two datasets come from a Latin hypercube design: one rescales fission so each eigenvalue lands on a target k from 0.90 to 1.10, the other keeps samples as drawn with k from 0.5 to 1.5.",
            "An MLP outputs k-eff and the flux profile, optionally with the diffusion-equation residual in the loss, tuned by cross-validated Optuna search that only accepts a config if it beats the defaults by more than seed noise. The key step comes after the network. The operator is symmetric, so k computed from the predicted flux by a Rayleigh quotient has an error quadratic in the flux error. A cheap Rayleigh-Ritz step then re-fits the flux amplitude between zones, which is exactly what the network gets wrong in near-degenerate cores.",
        ],
        autopsy: [
            "The network's own k-eff head reaches about 170-180 pcm RMSE on the rescaled test split and about 510 on the wider natural one. The Rayleigh quotient roughly halves that. With the Ritz re-fit at 17 hat functions, one per zone boundary plus one, k-eff RMSE drops to 1.5-2.3 pcm (rescaled) and 4.6-7.5 pcm (natural) with no solver calls, at 25-28x the solver's speed in batches of 3,000. With 33 hat functions it reaches 0.3-0.7 pcm at 7-8x.",
            "Out of distribution the re-fit holds up: 24-40 pcm RMSE, where the plain network is at 3,900-6,000 pcm. An earlier fallback gate, sending samples with a large residual to the solver, sent about 18% of out-of-distribution samples there; the re-fit beats it on accuracy and speed. Started from a flat flux instead of the network's, the same pipeline gives about 270 pcm, so the network is doing real work.",
            "Things that didn't pay off: the physics-informed loss cut the residual by about ten times without improving k-eff, and a zone head with a blended flux loss helped on one dataset and hurt on the other. For a single sample the hybrid is no faster than the solver; the speedup only exists in batches.",
        ],
        next: [
            "The limitations are the interesting part. One-group diffusion is not transport, one dimension is not three, and there is no thermal feedback and no burnup.",
            "The first one I'd close is training data from OpenMC instead of my own solver, so the surrogate is accelerating a real code rather than my approximation of one. In more dimensions the Ritz step's small eigenproblems grow, so its cost there is the open question.",
        ],
        links: [
            { label: "Source", href: "https://github.com/EliothK/neutro-surrogate" },
        ],
    },
];
