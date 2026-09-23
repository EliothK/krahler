import { useEffect, useState } from "react";

const SECTIONS = [
    { id: "projects-heading", label: "Projects" },
    { id: "work-heading", label: "Working on now" },
    { id: "skills-heading", label: "Skills" },
    { id: "experience-heading", label: "Experience" },
    { id: "certs-heading", label: "Certifications" },
    { id: "contact-heading", label: "Contact" },
];

// Desktop only (hidden below lg in CSS). Highlights the section crossing a line a little above the middle of the screen, which is where the reader's eye actually is.
export default function SectionNav() {
    const [active, setActive] = useState<string | null>(null);

    useEffect(() => {
        if (typeof IntersectionObserver === "undefined") return;

        const sections = SECTIONS.map(({ id }) => {
            const heading = document.getElementById(id);
            return { id, el: heading?.closest("section") ?? heading };
        }).filter((s): s is { id: string; el: HTMLElement } => !!s.el);

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const match = sections.find((s) => s.el === entry.target);
                    if (match) setActive(match.id);
                }
            },
            { rootMargin: "-40% 0px -55% 0px" },
        );
        sections.forEach((s) => observer.observe(s.el));
        return () => observer.disconnect();
    }, []);

    return (
        <nav className="section-nav" aria-label="On this page">
            <ul>
                {SECTIONS.map(({ id, label }) => (
                    <li key={id}>
                        <a
                            href={`#${id}`}
                            aria-current={active === id ? "location" : undefined}
                        >
                            {label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
