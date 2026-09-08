import { useEffect, useRef } from "react";
import type { Project } from "../scripts/projects";

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
                    <section>
                        <h4>The program</h4>
                        {project.program.map((t, i) => (
                            <p key={i}>{t}</p>
                        ))}
                    </section>
                    <section className="autopsy">
                        <h4>Autopsy</h4>
                        {project.autopsy.map((t, i) => (
                            <p key={i}>{t}</p>
                        ))}
                    </section>
                    <section className="next">
                        <h4>If I keep going</h4>
                        {project.next.map((t, i) => (
                            <p key={i}>{t}</p>
                        ))}
                    </section>
                    {project.links?.length ? (
                        <section>
                            <h4>Read the code</h4>
                            <p className="dialog-links">
                                {project.links.map((l) => (
                                    <a key={l.href} href={l.href}>
                                        {l.label}
                                    </a>
                                ))}
                            </p>
                        </section>
                    ) : null}
                </div>
            </div>
        </dialog>
    );
}

export default ProjectDialog;
