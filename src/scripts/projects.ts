export type Project = {
    id: string;
    title: string;
    stack: string;
    /** One line, visible on the card without opening anything. */
    summary: string;
    /** The measured number. `null` means "not measured yet" — say so, don't invent one. */
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
        stack: "GitHub Actions · Terraform · AKS · Podman · nginx",
        summary:
            "Commit to production with no manual steps and no credential stored anywhere.",
        figure: null,
        figureAccent: "flux",
        figurePending: "image size",
        figureLabel: "final image, down from ~1.1GB naive",
        program: [
            "Ship a containerized React app to a managed Kubernetes cluster with no manual steps and no stored credentials, on a budget small enough that leaving the cluster running over a weekend would be the expensive mistake.",
            "OIDC workload identity federation instead of a long-lived service principal secret, so no credential exists to leak or rotate. Terraform state in Azure Storage, because a runner is a fresh machine every time and local state makes automated infrastructure impossible. Multi-stage build: the Node stage is discarded, only nginx and the static output ship. Images tagged by commit SHA, never `latest` — so every running pod maps to exactly one commit, and rollback is redeploying a tag that already exists.",
        ],
        autopsy: [
            "Numbers to fill from real runs, never estimated: image size, pipeline duration, cold deploy time.",
            "What broke, and it is not a short list: the OIDC subject claim, character by character, against what GitHub actually sends. A label selector that matched nothing, so the Service routed to an empty set and timed out without an error. cert-manager stuck on an ACME challenge that was really a DNS propagation problem wearing a TLS costume.",
        ],
        next: [
            "Kubernetes is more than a one-page static site needs, and I'd rather say so than pretend otherwise — the point was to build the delivery path properly, not to right-size the workload.",
            "Under-engineered in the places that would matter at scale: one node, no staging environment, rolling updates rather than canary, and secrets that would belong in Key Vault the moment there were any. Staging environment first — it's the one whose absence I'd actually feel.",
        ],
        links: [
            { label: "The workflow", href: "https://github.com/eliothkrahler/portfolio/blob/main/.github/workflows/deploy.yml" },
            { label: "The Terraform", href: "https://github.com/eliothkrahler/portfolio/tree/main/terraform" },
            { label: "Full build log", href: "/build" },
        ],
    },
    {
        id: "solarcast",
        title: "SolarCast",
        stack: "Python · TensorFlow · XGBoost · Prophet · on-prem Linux + NVIDIA GPU",
        summary:
            "Generation forecasts from six hours to forty-eight weeks, on hardware that never leaves the building.",
        figure: "88–93 W/m²",
        figureAccent: "solar",
        figureLabel: "RMSE against a 99 W/m² dispatch target",
        program: [
            "Generation forecasts spanning six hours to forty-eight weeks. No single model covers that range — same-day dispatch and seasonal planning are different problems wearing the same label.",
            "An ensemble of LSTM, XGBoost and Prophet, each carrying the horizon it is actually good at. Deployed on an on-premise Linux server with GPU acceleration specifically so site data never leaves the company environment — an architecture chosen for data control, not for speed. Site-agnostic configuration: a new generation site is added at one config point with no change to core model code. NREL NSRDB and Open-Meteo feeds, automated data-quality checks, linear interpolation for stability.",
        ],
        autopsy: [
            "88–93 W/m² RMSE against a target of under 99 for same-day dispatch. The band is real and it is the number I'd defend.",
            "The honest part: the long end of the horizon is much weaker than the short end, which the single headline RMSE hides.",
        ],
        next: [
            "There's no automated retraining and no drift detection. Models are retrained by hand, which is fine at one site and won't hold at ten. I'd add a scheduled retrain with a hold-out check and monitor prediction error in production the same way I now monitor this site's deployment.",
            "The ensemble weights are fixed rather than learned per-horizon, and I'm not certain Prophet is earning its place at the long end. That's the first experiment I'd run.",
        ],
    },
    {
        id: "neutro",
        title: "NeutroSurrogate",
        stack: "Python · PyTorch · SciPy · finite volume · pytest in CI",
        summary:
            "A physics-informed surrogate for reactor diffusion, verified against analytic theory before anything was trained on it.",
        figure: null,
        figureAccent: "flux",
        figurePending: "median k-eff error, pcm",
        figureLabel: "benchmark not finished — nothing claimed yet",
        program: [
            "Reactor design sweeps need k-effective and flux profiles thousands of times over, and the diffusion solve is the bottleneck. The catch: a bare uniform slab has a closed-form solution, so a surrogate for it would be learning an algebraic formula. The geometry had to be multi-zone for the problem to be real.",
            "I wrote the multi-zone one-dimensional solver from scratch — finite volume, power iteration for k-effective — and verified it against analytic bare-slab theory with second-order convergence before training anything on it. A surrogate fitted to a buggy solver learns the bug perfectly. Latin-hypercube parameter sweep, using the exact linear scaling of the fission operator to sample uniformly near criticality instead of wasting samples far from it.",
        ],
        autopsy: [
            "Nothing is claimed on this project yet, deliberately. The benchmark isn't finished, so the panel carries no number.",
            "To fill: median k-eff error in pcm, flux relative L2 error, and speedup over the solver with the batch size stated — an unstated batch size is how inflated speedup numbers happen.",
        ],
        next: [
            "The limitations are the interesting part. One-group diffusion is not transport, one dimension is not three, and there is no thermal feedback and no burnup.",
            "The first one I'd close is training data from OpenMC instead of my own solver, so the surrogate is accelerating a real code rather than my approximation of one.",
        ],
    },
    {
        id: "endothon",
        title: "Endothon Finance",
        stack: "Java · Spring Boot · JUnit 5",
        summary:
            "A fiscal-year defect in a live loan-servicing app that survived because it couldn't be tested in isolation.",
        figure: "100%",
        figureAccent: "flux",
        figureLabel: "requirement coverage, both business-rule paths",
        program: [
            'A logic defect in the fiscal-year calculation of a live loan-servicing application, where the correct result depends on whether a business is classified "Established" or "New". Calculation, validation and rendering were entangled in one place, so the defect could not be tested in isolation — which is why it survived.',
            "Split into three units with one job each: FiscalYearCalculator for the logic, InputValidator for data integrity, YearFieldRenderer for the interface. The refactor was not the fix; it was what made the fix testable.",
        ],
        autopsy: [
            '100% requirement coverage via JUnit 5 across both the "Established" and "New" rules.',
            "Which is a weaker claim than it sounds. The tests were written against the stated requirements, so they prove the code does what the spec says — not that the spec covers the boundaries. And I refactored before writing characterization tests against the broken behaviour, which worked out here and is not the order I'd repeat.",
        ],
        next: [
            "Explicit boundary cases around fiscal-year transitions and leap years, and an integration test that exercises the three classes together — the split introduced a seam that nothing currently tests.",
        ],
    },
    {
        id: "london",
        title: "London Hotel",
        stack: "Java · concurrency · resource bundles · Docker",
        summary:
            "Concurrent booking with EN/FR localization and reservation times synced across three time zones.",
        figure: null,
        figureAccent: "flux",
        figurePending: "—",
        figureLabel: "coursework project, no production metric",
        program: [
            "Multi-threaded Java handling concurrent booking operations, with EN/FR resource bundles for localization and reservation times synchronized across ET, MT and UTC. Packaged as a single Docker image.",
            "Time zone handling was the genuinely hard part. Storing everything in UTC and converting at the boundary is obvious in hindsight and wasn't obvious while the bug was live.",
        ],
        autopsy: [
            "This one is here for range rather than depth, and it's honest to say so. It's coursework, it has no production metric, and it's the fifth card for a reason.",
        ],
        next: ["TODO — one line, something real."],
    },
];
