import { render, screen } from "@testing-library/react";
import ProjectPage from "../../components/ProjectPage";
import { PROJECTS } from "../../scripts/projects";
import { projectRoutes } from "../../entry-server";

const byId = (id) => PROJECTS.find((p) => p.id === id);

describe("ProjectPage", () => {
    it.each(PROJECTS.map((p) => [p.id, p]))("renders %s's whole write-up under its own h1", (_id, project) => {
        render(<ProjectPage project={project} />);
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(project.title);
        expect(screen.getByText(project.summary)).toBeInTheDocument();
        for (const name of ["The program", "Autopsy", "If I keep going"]) {
            expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
        }
        for (const t of [...project.program, ...project.autopsy, ...project.next]) {
            expect(screen.getByText(t)).toBeInTheDocument();
        }
    });

    it("shows the measured figure and its label", () => {
        const solar = byId("solarcast");
        render(<ProjectPage project={solar} />);
        expect(screen.getByText(solar.figure)).toBeInTheDocument();
        expect(screen.getByText(solar.figureLabel)).toBeInTheDocument();
    });

    it("omits the figure when a project has none", () => {
        const { container } = render(<ProjectPage project={{ ...byId("solarcast"), figure: null }} />);
        expect(container.querySelector(".project-figure")).toBeNull();
    });

    it("links back to the portfolio and to the other projects, not itself", () => {
        render(<ProjectPage project={byId("solarcast")} />);
        expect(screen.getByRole("link", { name: "Back to the portfolio" })).toHaveAttribute("href", "/");
        const nav = screen.getByRole("navigation", { name: "Other projects" });
        const hrefs = [...nav.querySelectorAll("a")].map((a) => a.getAttribute("href"));
        expect(hrefs).toEqual(["/projects/pipeline", "/projects/neutrosurrogate"]);
    });

    it("sets the tab title and restores it on unmount", () => {
        document.title = "before";
        const { unmount } = render(<ProjectPage project={byId("neutrosurrogate")} />);
        expect(document.title).toBe("NeutroSurrogate - Elioth Krahler");
        unmount();
        expect(document.title).toBe("before");
    });
});

describe("projectRoutes (read by the prerender script)", () => {
    it("has one route per project, written to projects/<id>/index.html", () => {
        expect(projectRoutes.map((r) => r.file)).toEqual(PROJECTS.map((p) => `projects/${p.id}/index.html`));
    });

    it("gives each route its title, summary as description, and canonical URL", () => {
        const route = projectRoutes.find((r) => r.path === "/projects/solarcast");
        expect(route.title).toBe("SolarCast - Elioth Krahler");
        expect(route.description).toBe(byId("solarcast").summary);
        expect(route.canonical).toBe("https://krahler.com/projects/solarcast");
    });

    // The prerender script puts the description into an attribute with a plain string replace, so a double quote would break the tag.
    it("has no double quotes in any description", () => {
        for (const r of projectRoutes) expect(r.description).not.toContain('"');
    });
});
