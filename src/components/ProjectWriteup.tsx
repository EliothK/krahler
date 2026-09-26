import type { Project } from "../scripts/projects";
import SleepTimeline from "./SleepTimeline";

// The write-up's sections, shared by the pop-up (under its h3 title) and the project's own page (under its h1), so the two can't drift apart.
type Props = { project: Project; headingLevel: 2 | 4 };

export default function ProjectWriteup({ project, headingLevel }: Props) {
  const H = `h${headingLevel}` as const;

  return (
    <>
      <section>
        <H>The program</H>
        {project.program.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </section>
      {project.feature ? (
        <section className="feature">
          <H>{project.feature.heading}</H>
          <p>{project.feature.text}</p>
          {project.feature.diagram === "sleep-timeline" && <SleepTimeline />}
          <p>
            <a href={project.feature.href}>{project.feature.linkLabel}</a>
          </p>
        </section>
      ) : null}
      <section className="autopsy">
        <H>Autopsy</H>
        {project.autopsy.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </section>
      <section className="next">
        <H>If I keep going</H>
        {project.next.map((t, i) => (
          <p key={i}>{t}</p>
        ))}
      </section>
      {project.links?.length ? (
        <section>
          <H>Read the code</H>
          <p className="dialog-links">
            {project.links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                // Pages on this site open in place, like the profile card's links.
                {...(l.href.startsWith("/")
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
              >
                {l.label}
              </a>
            ))}
          </p>
        </section>
      ) : null}
    </>
  );
}
