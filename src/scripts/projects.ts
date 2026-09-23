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
            "Still under-engineered: no staging environment, and Terraform applied by hand rather than by the pipeline. A bad deploy fails the post-deploy checks and a scheduled uptime workflow opens an issue, but by then it's already live. Staging environment first - it's the one whose absence I'd actually feel.",
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
        stack: "Python · TensorFlow · XGBoost · Prophet · Optuna · on-prem Linux + NVIDIA GPU",
        summary:
            "Solar irradiance forecasts from six hours to forty-eight weeks ahead, trained on ten years of NSRDB data on my own hardware.",
        figure: "88–93 W/m²",
        figureAccent: "solar",
        figureLabel: "test-set RMSE, 6h and 12h ahead (XGBoost), against a 99 W/m² target - 10% of peak irradiance",
        program: [
            "Forecast Global Horizontal Irradiance (GHI) for a generation site. No single model covers six hours to forty-eight weeks - same-day dispatch and seasonal planning are different problems wearing the same label - so the horizons are split and each gets the model that handles it best.",
            "Ten years (2015-2024) of hourly NREL NSRDB data feed a six-notebook pipeline: acquisition, preprocessing with cyclical time features and gap interpolation, modeling, test-set evaluation, five-fold time-series cross-validation, and hyperparameter tuning (Optuna for XGBoost, Keras Tuner for the LSTM, grid search for Prophet). Hourly LSTM, XGBoost and Prophet models cover 6h and 12h ahead; daily XGBoost covers 7 and 14 days; daily Prophet covers 4 to 48 weeks. run_pipeline.py takes a latitude and longitude, so a new site is one command and no change to model code. predict_today.py pulls live weather from Open-Meteo and returns a forecast from any model or the mean of all three. Training runs locally on a Linux machine with an NVIDIA GPU, with no cloud services beyond the two public data feeds. This is a portfolio project, not a production deployment.",
        ],
        autopsy: [
            "On the held-out test set, XGBoost reaches 88.1 W/m² RMSE at 6h and 93.4 at 12h (R² 0.87 and 0.86); the LSTM is close behind at 90.7 and 98.0. Prophet is far worse at short range (about 155 W/m², R² near 0.6), which is why it isn't used there.",
            "The target is 10% of peak irradiance (about 990 W/m² in this data). Cross-validation is less flattering than the test set. XGBoost's fold RMSE averages about 94 W/m² at 6h and about 100 at 12h, so the 12h model sits right on the 99 W/m² target rather than safely under it. The 88–93 band is the test-set number, not the whole story.",
            "The long end is much weaker. Daily forecasts from 7 days to 48 weeks hold at R² of roughly 0.64-0.69 with RMSE of 1,300-1,450 Wh/m² per day, and the error barely improves or degrades across horizons. That is close to the limit of what the model can say about weather it can't see, and the single headline RMSE hides it.",
        ],
        next: [
            "There's no automated retraining and no drift detection. Models are retrained by hand, which is fine at one site and won't hold at ten. I'd add a scheduled retrain with a hold-out check and monitor prediction error in production the same way I now monitor this site's deployment.",
            "The combined forecast is a plain mean of the three models, not a learned weighting, and Prophet is clearly the weakest at short range, so an unweighted mean probably drags it down. Learning per-horizon weights is the first experiment I'd run.",
        ],
        links: [
            { label: "Source", href: "https://github.com/EliothK/SolarCast" },
        ],
    },
    {
        id: "neutro",
        title: "NeutroSurrogate",
        stack: "Python · PyTorch · SciPy · finite volume · pytest in CI",
        summary:
            "A physics-informed neural surrogate for one-group neutron diffusion in a multi-zone slab reactor, built on a solver I verified against analytic theory before training anything.",
        figure: "510 pcm",
        figureAccent: "flux",
        figureLabel: "median k-eff error on 300,000 held-out samples (95th percentile 1,646 pcm)",
        program: [
            "Reactor design sweeps need the effective multiplication factor (k-eff) and the flux profile thousands of times over, and the eigenvalue solve is the bottleneck. A bare uniform slab has a closed-form solution, so a surrogate for it would only be learning an algebraic formula. The geometry has to be multi-zone for the problem to be real: 50 zones over 200 cells, each with its own diffusion coefficient, absorption and fission production, plus the slab width - a 151-dimensional input.",
            "I wrote the finite-volume solver from scratch and cross-checked it two ways before training anything on it: the uniform case matches analytic bare-slab theory to under 1 pcm and converges at second order, and ARPACK agrees with an independent power-iteration solver. A surrogate fitted to a buggy solver learns the bug perfectly. Samples come from a Latin hypercube design, and each is rescaled using the exact linear scaling of the fission term so its eigenvalue lands on a target k drawn from 0.90 to 1.10 - uniform coverage near criticality instead of samples wasted far from it. A tested guard stops the design from collapsing back into a solvable bare slab.",
            "The surrogate is a SiLU MLP that outputs k-eff and the whole flux profile from a shared trunk. It can be trained on data alone or with the diffusion-equation residual added to the loss, and it is benchmarked against ridge regression and gradient-boosted trees as well as the solver.",
        ],
        autopsy: [
            "Trained on 3 million solved samples for 500 epochs. On 300,000 held-out samples the data-only surrogate has a median k-eff error of 510 pcm (about 0.5%), 1,646 pcm at the 95th percentile, and 16,291 pcm at the worst case. Median flux error is 8.6% relative L2, 38% at the 95th percentile. Ridge regression and gradient-boosted trees land near 4,000 pcm, so the network is roughly eight times more accurate on k-eff, and trees can't produce a flux profile at all.",
            "Against the solver on the same GPU host: 0.88 ms per ARPACK solve, 0.08 ms for one surrogate call (11x), and 0.00026 ms per sample at a batch size of 1,000 (about 3,400x). The batched figure is the one that matters for design sweeps, and it only holds when you have thousands of evaluations to batch. Single-call speedup is a modest 11x.",
            "The physics-informed loss did not win on accuracy. It cut the diffusion-equation residual by about ten times (0.78 to 0.076) but median k-eff error was slightly worse, 525 vs 510 pcm, and flux error about the same. Residual-consistent is not the same as more accurate, and the tails are still large: 500 pcm median is not good enough to replace the solver where criticality margins are tight.",
        ],
        next: [
            "The limitations are the interesting part. One-group diffusion is not transport, one dimension is not three, and there is no thermal feedback and no burnup.",
            "The biggest practical gap is the error tails: a 510 pcm median is usable for screening, not for tight criticality margins, so I'd look at where the worst cases sit in parameter space and sample more densely there. After that, the first limitation I'd close is training data from OpenMC instead of my own solver, so the surrogate is accelerating a real code rather than my approximation of one.",
        ],
        links: [
            { label: "Source", href: "https://github.com/EliothK/neutro-surrogate" },
        ],
    },
];
