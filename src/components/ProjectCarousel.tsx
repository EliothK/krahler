import { useCallback, useEffect, useRef, useState } from "react";
import { PROJECTS, type Project } from "../scripts/projects";

type Props = { onOpen: (p: Project) => void };

function ProjectCarousel({ onOpen }: Props) {
    const railRef = useRef<HTMLDivElement>(null);
    const [index, setIndex] = useState(1);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    const stepWidth = useCallback(() => {
        const rail = railRef.current;
        const item = rail?.querySelector<HTMLElement>(".rail-item");
        if (!rail || !item) return 340;
        const gap = parseFloat(getComputedStyle(rail).columnGap || "16") || 16;
        return item.getBoundingClientRect().width + gap;
    }, []);

    const sync = useCallback(() => {
        const rail = railRef.current;
        if (!rail) return;
        const atRailEnd = rail.scrollLeft > rail.scrollWidth - rail.clientWidth - 8;
        setIndex(
            atRailEnd
                ? PROJECTS.length
                : Math.min(
                      PROJECTS.length,
                      Math.round(rail.scrollLeft / stepWidth()) + 1,
                  ),
        );
        setAtStart(rail.scrollLeft < 8);
        setAtEnd(atRailEnd);
    }, [stepWidth]);

    useEffect(() => {
        sync();
        window.addEventListener("resize", sync);
        return () => window.removeEventListener("resize", sync);
    }, [sync]);

    const scrollBy = (dir: -1 | 1) => {
        const rail = railRef.current;
        if (!rail) return;
        if (dir === 1 && atEnd) {
            rail.scrollTo({ left: 0, behavior: "smooth" });
            return;
        }
        rail.scrollBy({ left: dir * stepWidth() });
    };

    return (
        <>
            <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3">
                <div>
                    <h2 id="projects-heading" className="mb-2">
                        Five things I built
                    </h2>
                    <p className="section-intro mb-0">
                        Open any one for the full write-up: what it is, the
                        autopsy, and what I'd change.
                    </p>
                </div>
                <div className="rail-nav">
                    <span className="rail-count" aria-live="polite">
                        {index} / {PROJECTS.length}
                    </span>
                    <button
                        type="button"
                        className="rail-btn"
                        onClick={() => scrollBy(-1)}
                        disabled={atStart}
                        aria-label="Previous projects"
                    />
                    <button
                        type="button"
                        className="rail-btn"
                        onClick={() => scrollBy(1)}
                        aria-label="More projects"
                    />
                </div>
            </div>
            <div
                className="rail"
                ref={railRef}
                onScroll={sync}
                tabIndex={0}
                role="group"
                aria-label="Projects scrollable"
            >
                {PROJECTS.map((p) => (
                    <div className="rail-item" key={p.id}>
                        <button
                            type="button"
                            className="proj-card"
                            onClick={() => onOpen(p)}
                            aria-haspopup="dialog"
                        >
                            <h3 className="proj-title">{p.title}</h3>
                            <p className="proj-stack">{p.stack}</p>
                            <p className="proj-sum">{p.summary}</p>

                            <span
                                className={
                                    p.figure
                                        ? `figure ${p.figureAccent}`
                                        : "figure unset"
                                }
                            >
                                {p.figure ?? p.figurePending}
                            </span>
                            <p className="figure-label">{p.figureLabel}</p>

                            <span className="open-cue">Read the write-up</span>
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
}

export default ProjectCarousel;
