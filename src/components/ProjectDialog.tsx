import { useEffect, useRef } from "react";
import { projectPath, type Project } from "../scripts/projects";
import ProjectWriteup from "./ProjectWriteup";

type Props = { project: Project | null; onClose: () => void };

function ProjectDialog({ project, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (project && !dlg.open) dlg.showModal();
    if (!project && dlg.open) dlg.close();
  }, [project]);

  if (!project) return null;

  return (
    <dialog
      ref={ref}
      className="proj-dialog"
      aria-labelledby="dlg-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="dialog-panel">
        <div className="dialog-head">
          <div>
            <h3 id="dlg-title">{project.title}</h3>
            <p className="quiet dialog-stack">{project.stack}</p>
          </div>
          <button
            type="button"
            className="x-btn"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="dialog-body">
          <ProjectWriteup project={project} headingLevel={4} />
          <p className="dialog-permalink">
            <a href={projectPath(project)}>Open this write-up as its own page</a>
          </p>
        </div>
      </div>
    </dialog>
  );
}

export default ProjectDialog;
