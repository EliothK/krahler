import { useEffect } from "react";
import { PROJECTS, projectPageTitle, projectPath, type Project } from "../scripts/projects";
import ProjectWriteup from "./ProjectWriteup";

// One project's write-up at /projects/<id>, prerendered so a single write-up can be linked, shared and indexed on its own.
export default function ProjectPage({ project }: { project: Project }) {
  useEffect(() => {
    const previous = document.title;
    document.title = projectPageTitle(project);
    return () => {
      document.title = previous;
    };
  }, [project]);

  const others = PROJECTS.filter((p) => p.id !== project.id);

  return (
    <div className="container-xl py-4 py-lg-5">
      <main id="main" className="project-page">
        <p className="mb-3">
          <a href="/">Back to the portfolio</a>
        </p>
        <header className="pb-4">
          <h1 className="lede mb-3">{project.title}</h1>
          <p className="quiet lede-sub">{project.summary}</p>
          <p className="quiet dialog-stack">{project.stack}</p>
          {project.figure ? (
            <p className="project-figure">
              <span className={`figure ${project.figureAccent}`}>
                {project.figure}
              </span>{" "}
              <span className="figure-label">{project.figureLabel}</span>
            </p>
          ) : null}
        </header>
        <article className="dialog-body">
          <ProjectWriteup project={project} headingLevel={2} />
        </article>
        <nav className="pt-4" aria-label="Other projects">
          <h2>Other projects</h2>
          <ul className="not-found-links">
            {others.map((p) => (
              <li key={p.id}>
                <a href={projectPath(p)}>{p.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      </main>
    </div>
  );
}
