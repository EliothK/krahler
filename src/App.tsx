//Components
import { useState } from "react";
import ProfileCard from "./components/ProfileCard";
import ProjectCarousel from "./components/ProjectCarousel";
import ProjectDialog from "./components/ProjectDialog";
import RecentWork from "./components/RecentWork";
import Skills from "./components/Skills";
import Experience from "./components/Experience";
import Certifications from "./components/Certifications";
import type { Project } from "./scripts/projects";

//Assets

export default function App() {
    const [open, setOpen] = useState<Project | null>(null);

    return (
        <>
            <a className="skip" href="#main">
                Skip to content
            </a>

            <div className="container-xl py-4 py-lg-5">
                <div className="row g-4 g-lg-5">
                    <div className="col-lg-3">
                        <ProfileCard />
                    </div>

                    <div className="col-lg-9">
                        <main id="main">
                            <header className="pb-4">
                                <p className="lede mb-3">
                                    Physics-bound, but I ship
                                </p>
                                <p className="quiet lede-sub">
                                    A GPU forecasting system in production, a
                                    verified reactor-physics surrogate, and this
                                    site - delivered by a pipeline I built end
                                    to end.
                                </p>
                            </header>
                            {/** <ForecastHero /> */}

                            <section
                                className="band"
                                aria-labelledby="projects-heading"
                            >
                                <ProjectCarousel onOpen={setOpen} />
                            </section>

                            <RecentWork />
                            <Skills />
                            <Experience />
                            <Certifications />
                        </main>

                        <footer>
                            <p className="mb-0">
                                Built with React and Vite, containerized with
                                Podman, provisioned with Terraform, deployed to
                                AKS by GitHub Actions on every push to main.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
            <ProjectDialog project={open} onClose={() => setOpen(null)} />
        </>
    );
}
