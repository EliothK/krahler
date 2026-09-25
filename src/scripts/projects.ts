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
    /** A diagram shown in the dialog as a teaser for the longer write-up it links to. */
    feature?: { heading: string; text: string; diagram: "sleep-timeline"; href: string; linkLabel: string };
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
            "The parts that carried over: OIDC workload identity federation instead of a long-lived service principal secret, scoped to the production environment, so there is no secret to leak or rotate. Terraform state in Azure Storage, because a runner is a fresh machine every time and local state would not survive it. CI runs lint, tests, a build, and terraform fmt and validate on every change, and the API's Maven tests on every API change. After each deploy, a smoke test, a real-browser check and a Lighthouse score gate run against the live site. The parts that were about the container and went with it: a multi-stage image, images tagged by commit SHA and deployed by digest, Trivy scanning and build-provenance attestation.",
            "Every pull request deploys the exact build CI tested to a staging environment on the same Static Web App, and the smoke test and browser checks run there; a pull request can't merge until they pass. The production deploy gets its own login, which only the main branch can use.",
            "Terraform is in the pipeline too. Every pull request gets a plan comment from an identity that can read Azure but not change it. After merge, a change waits for my approval, then re-plans and applies only if the plan still matches what I approved. A weekly run fails if Azure has drifted from the code, which is how a hand-made change would get caught.",
            "There is no database password anywhere. The API signs in to Azure SQL as its Container App's managed identity, and password sign-in is switched off on the server, so there's nothing in GitHub, the container's secrets or the Terraform state to leak or rotate.",
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
            "First, the number this card is missing: a measured monthly cost, AKS versus Static Web Apps. The database was meant to pause when idle but never did, because every API cold start connected to it to check its schema. Now only a contact-form submission touches it. Once a billing period confirms it pauses, I'll publish the real comparison.",
            "Still under-engineered: staging shares the production API and database, so a contact-form test from staging is a real message. A separate staging API and database would fix that, but it roughly doubles the backend bill for a site this size, so I'm weighing it rather than assuming it.",
            "Staging and production are kept apart by GitHub environments, not by credentials: the Static Web Apps deployment token can deploy to either. Separate tokens or identities per environment would close that gap.",
        ],
        links: [
            { label: "The workflow", href: "https://github.com/EliothK/krahler/blob/main/.github/workflows/deploy.yml" },
            { label: "The Terraform", href: "https://github.com/EliothK/krahler/tree/main/terraform" },
            { label: "Full build log", href: "/build" },
        ],
        feature: {
            heading: "Why the database never slept",
            text: "The database should pause after an hour with no connections. It never did: the uptime check woke the API about three times an hour, and every startup connected to the database. Fixing it took two rounds.",
            diagram: "sleep-timeline",
            href: "/build#sleep-heading",
            linkLabel: "Read the full story",
        },
    },
    {
        id: "solarcast",
        title: "SolarCast",
        stack: "Python · XGBoost · TensorFlow · Optuna · Keras Tuner · pytest in CI · on-prem Linux + NVIDIA GPU",
        summary:
            "Predicts how much sunlight will reach a solar site 6 to 48 hours ahead, with 24% less error than the free weather forecast it starts from.",
        figure: "24% less error",
        figureAccent: "solar",
        figureLabel: "than the Open-Meteo weather forecast alone, 6 and 12 hours ahead, on a year of data the models never saw",
        program: [
            "A solar farm needs to know how much sunlight is coming so it can plan how much power it will sell. Free weather forecasts already predict sunlight, so the question is whether a model can do better than just using them. SolarCast takes the Open-Meteo forecast, learns where it tends to be wrong, and corrects it, checking itself against satellite measurements of the sunlight that actually arrived (NREL's NSRDB).",
            "The first version had a flaw: it learned from satellite data that isn't available in real time, so the live forecast fed it data it had never trained on. The rebuild trains on the same kind of forecast data it gets live. Two models (XGBoost and an LSTM neural network) each make a prediction and are averaged, with more weight on whichever did better in validation. The notebooks became a tested Python package: one command trains a new site from its latitude and longitude, and the tests run automatically on every change. This is a portfolio project, not a production deployment.",
        ],
        autopsy: [
            "How it's scored: every model is tested on 2024 data from Bismarck, ND that it never trained on, and compared with two baselines. The first is the plain Open-Meteo forecast, which is what you'd use without this project. The second is my old model, run the way it actually ran live. The score is the typical size of a miss (root-mean-square error) in watts per square metre; full midday sun here is about 990 W/m².",
            "6 and 12 hours ahead, the typical miss is about 59 W/m², roughly 6% of full sun. The forecast alone misses by 78, so that is 24% less error. The old model missed by 98 to 103, so the rebuild cut its error by 40%. The models explain about 94% of the hour-to-hour variation in sunlight (R² 0.94), against 90% for the forecast alone.",
            "1 and 2 days ahead the gain is smaller: 58 vs 60 W/m² for the forecast one day ahead (4% less error, close to noise) and 59 vs 69 two days ahead (14% less). These use forecasts really issued a day or two earlier, but only cover August to December 2024, so they are less certain. Live error will also be somewhat higher than these archive scores.",
            "Where it failed the baseline: forecasts 1 week to 48 weeks ahead are no better than simply guessing the average sunlight for that day of the year. The first version reported those models without making that comparison, so it looked better than it was.",
        ],
        next: [
            "Replace the long-range models with the day-of-year average unless they can beat it. And every number here comes from one site; the pipeline works anywhere, but I haven't yet shown the gain holds at a second one.",
            "There's no automatic retraining or tracking of live accuracy. I'd log each live forecast against the satellite data that arrives later, which would measure the real live error instead of estimating it from the archive.",
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
            "A neural network plus a physics correction that predicts whether a simplified reactor design sustains a chain reaction, 25 times faster than the exact solver and off by about 0.002%.",
        figure: "0.002% off",
        figureAccent: "flux",
        figureLabel: "typical error in k-eff on designs it never trained on, 25x faster than the exact solver; simple regression is off by about 4.6%",
        program: [
            "A reactor's k-eff says whether its chain reaction grows (above 1), dies out (below 1) or holds steady (exactly 1). Designers check it for thousands of candidate designs, and each check means solving an equation that is slow to compute. The goal is a model that gives the same answer much faster. Reactor physicists measure k-eff error in pcm, where 1 pcm is 0.001%; a few hundred pcm matters for safety margins.",
            "I wrote the exact solver myself and checked it against a textbook case with a known answer (it agrees to within 0.001%) before training anything on it, because a model trained on a buggy solver learns the bug. The test reactor is a 1D slab split into 16 zones with different materials, and the training designs are spread evenly over the possible materials. A neural network predicts both k-eff and the shape of the neutron population across the reactor.",
            "The key step comes after the network. The shape prediction is more reliable than the network's direct k-eff guess, and a standard physics formula (a Rayleigh quotient) turns a nearly right shape into a much more accurate k-eff. A quick correction (a Rayleigh-Ritz re-fit) then fixes the most common mistake in the shape: too much power in one part of the reactor and too little in another.",
        ],
        autopsy: [
            "How it's scored: 3,000 test designs the models never saw, compared against the exact solver's answers, and against three baselines. Numbers below are the typical error (root-mean-square error) unless marked as a median, meaning half the designs are better than that value.",
            "Simple baselines: linear regression is off by about 4,600 pcm (4.6%) for a median design and decision trees (gradient-boosted) by about 3,100 pcm (3.1%); neither can predict the neutron shape at all. The neural network alone gets the median down to about 270 pcm (0.27%), more than ten times better than the trees, but with a typical error of 170-180 pcm that is still too large to trust near a safety margin.",
            "With the physics correction, the typical error drops to 1.5-2.3 pcm (about 0.002%), roughly 100 times better than the network alone, while still running about 25 times faster than the exact solver across a batch of 3,000 designs. A stricter setting reaches under 1 pcm at 7-8 times the solver's speed. To check the network matters, I ran the same correction starting from a flat guess instead of the network's: the error was about 270 pcm, over 100 times worse.",
            "On unusual designs outside the training range, the network alone is off by 3,900-6,000 pcm (4-6%); with the correction it is off by 24-40 pcm (under 0.04%). A version that sends doubtful designs back to the exact solver had to send about 18% of those designs, where the correction needs none. What didn't pay off: adding the physics equation to the network's training made its answers more physically consistent but not more accurate. And for a single design the speedup vanishes; it only exists in batches.",
        ],
        next: [
            "The model is deliberately simplified: one energy group instead of many, one dimension instead of three, and no temperature feedback or fuel burn-up.",
            "The first thing I'd close is training on a real reactor physics code (OpenMC) instead of my own solver, so the model is accelerating an industry tool rather than my simplified one. In 3D the correction step gets more expensive, so whether it keeps its speed there is the open question.",
        ],
        links: [
            { label: "Source", href: "https://github.com/EliothK/neutro-surrogate" },
        ],
    },
];
