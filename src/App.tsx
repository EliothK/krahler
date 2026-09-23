//Components
import { useState } from "react";
import ProfileCard from "./components/ProfileCard";
import ProjectCarousel from "./components/ProjectCarousel";
import ProjectDialog from "./components/ProjectDialog";
import RecentWork from "./components/RecentWork";
import Skills from "./components/Skills";
import Experience from "./components/Experience";
import Certifications from "./components/Certifications";
import Contact from "./components/Contact";
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
                                    Curious first. Shipped second.
                                </p>
                                <p className="quiet lede-sub">
                                    I learn whatever the problem needs: solar
                                    forecasting, reactor physics, then
                                    Kubernetes, Terraform and a Java API to
                                    build this site. Each one is shipped and
                                    written up, including what broke. That same
                                    curiosity is why I'll eventually get my PhD
                                    in physics.
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
                            <Contact />
                        </main>

                        <footer>
                            <p className="mb-0">
                                Built with React and Vite and a Spring Boot
                                API, provisioned with Terraform, deployed to
                                Azure Static Web Apps and Container Apps by
                                GitHub Actions on every push to main. It ran on
                                Kubernetes first; the{" "}
                                <a href="/build">build log</a> covers both.
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
            <ProjectDialog project={open} onClose={() => setOpen(null)} />
        </>
    );
}
