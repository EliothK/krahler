const TIERS: {
    heading: string;
    caveat?: string;
    skills: string[];
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
        heading: "Added during this project",
        caveat:
            "These are four weeks old. I'm listing them separately because the difference between shipped and studied is worth being precise about.",
        skills: [
            "GitHub Actions",
            "Terraform",
            "Kubernetes / AKS",
            "React",
            "Azure Monitor",
        ],
    },
];

export default function Skills() {
    return (
        <section className="band" aria-labelledby="skills-heading">
            <h2 id="skills-heading" className="mb-2">
                Skills
            </h2>
            <p className="section-intro mb-4">
                Three buckets, labeled honestly. No bars, no percentages, no
                stars.
            </p>

            {TIERS.map((tier) => (
                <div className="tier" key={tier.heading}>
                    <h3>{tier.heading}</h3>
                    <ul>
                        {tier.skills.map((s) => (
                            <li key={s}>{s}</li>
                        ))}
                    </ul>
                    {tier.caveat && <p className="caveat mb-0">{tier.caveat}</p>}
                </div>
            ))}
        </section>
    );
}
