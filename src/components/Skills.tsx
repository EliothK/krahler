const REPO = "https://github.com/EliothK/krahler";

// A skill is either a plain name or a name with a link to the file in this repo that shows it.
type Skill = string | { name: string; href: string };

const TIERS: {
    heading: string;
    caveat?: string;
    skills: Skill[];
}[] = [
    {
        heading: "Built production or graded work with",
        skills: [
            "Java",
            "Spring Boot",
            "JUnit 5",
            "Python",
            "Docker",
            "Podman",
            "Git",
            "Maven",
            "Linux",
            "PowerShell",
            "SQL",
            "XGBoost",
            "LSTM",
            "Prophet",
            "TensorFlow",
            "scikit-learn",
            "NumPy",
            "NVIDIA GPU acceleration",
            "Azure",
        ],
    },
    {
        heading: "Coursework and certified fundamentals",
        skills: [
            "C#",
            "HTML/CSS",
            "data structures & algorithms",
            "operating systems (process and memory management, concurrency)",
            "relational design & normalization",
            "object-oriented design and design patterns",
            "IT governance and business-IT alignment",
        ],
    },
    {
        heading: "Learned by building this site",
        caveat: "These are newer to me than the rest, so they're listed apart. Each one links to the file in this repo that shows it, so you can judge the work instead of taking my word.",
        skills: [
            {
                name: "GitHub Actions",
                href: `${REPO}/blob/main/.github/workflows/deploy.yml`,
            },
            {
                name: "Terraform",
                href: `${REPO}/blob/main/terraform/static-web-app.tf`,
            },
            {
                name: "Azure Static Web Apps",
                href: `${REPO}/blob/main/public/staticwebapp.config.json`,
            },
            {
                name: "Azure Container Apps",
                href: `${REPO}/blob/main/api/terraform/container-app.tf`,
            },
            {
                name: "Azure SQL + Flyway",
                href: `${REPO}/blob/main/api/src/main/resources/db/migration/V1__create_contact_messages.sql`,
            },
            {
                name: "Kubernetes / AKS",
                href: `${REPO}/tree/main/lab/k8s`,
            },
            {
                name: "Azure Monitor",
                href: `${REPO}/blob/main/lab/terraform/monitoring.tf`,
            },
            { name: "React", href: `${REPO}/blob/main/src/App.tsx` },
        ],
    },
];

export default function Skills() {
    return (
        <section className="band" aria-labelledby="skills-heading">
            <h2 id="skills-heading" className="mb-2">
                Skills
            </h2>

            {TIERS.map((tier) => (
                <div className="tier" key={tier.heading}>
                    <h3>{tier.heading}</h3>
                    <ul>
                        {tier.skills.map((s) =>
                            typeof s === "string" ? (
                                <li key={s}>{s}</li>
                            ) : (
                                <li key={s.name}>
                                    <a
                                        href={s.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {s.name}
                                    </a>
                                </li>
                            ),
                        )}
                    </ul>
                    {tier.caveat && (
                        <p className="caveat mb-0">{tier.caveat}</p>
                    )}
                </div>
            ))}
        </section>
    );
}
