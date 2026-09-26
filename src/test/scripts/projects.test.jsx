import { render, screen } from "@testing-library/react";
import Skills from "../../components/Skills";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROJECTS, projectPath } from "../../scripts/projects";

const byId = (id) => {
    const project = PROJECTS.find((p) => p.id === id);
    if (!project) throw new Error(`no project ${id}`);
    return project;
};
const allText = (id) => {
    const p = byId(id);
    return [p.summary, p.figureLabel, ...p.program, ...p.autopsy, ...p.next].join(" ");
};

describe("project write-ups", () => {
    it("every project has a summary and each dialog section", () => {
        for (const p of PROJECTS) {
            expect(p.summary.length, p.id).toBeGreaterThan(0);
            expect(p.program.length, p.id).toBeGreaterThan(0);
            expect(p.autopsy.length, p.id).toBeGreaterThan(0);
            expect(p.next.length, p.id).toBeGreaterThan(0);
        }
    });

    // Night hours are always zero, so an all-hours RMSE alone flatters a solar forecast.
    it("SolarCast reports daylight-only RMSE alongside all hours, and names the metric", () => {
        const text = allText("solarcast");
        expect(text).toMatch(/daylight/i);
        expect(text).toContain("root-mean-square error");
        expect(text).not.toMatch(/typical (size of a )?miss/i);
    });

    it("the pipeline card shows a measured cost, not a pending note", () => {
        const pipeline = byId("pipeline");
        expect(pipeline.figure).toMatch(/\$/);
        expect(allText("pipeline")).not.toMatch(/pending|once the cutover is done/i);
    });

    // A 250x jump from the old median to the new figure invites the question; the label has to say they measure different things.
    it("NeutroSurrogate's headline says it includes the correction and gives the network-alone error", () => {
        const label = byId("neutrosurrogate").figureLabel;
        expect(label).toMatch(/physics correction/);
        expect(label).toMatch(/network alone/);
    });

    it("NeutroSurrogate explains its speed-up against other surrogates", () => {
        expect(allText("neutrosurrogate")).toMatch(/1,000 times/);
    });

    it("NeutroSurrogate reports the model combination result", () => {
        expect(allText("neutrosurrogate")).toMatch(/largest k-eff/i);
    });

    // The id is the URL (/projects/<id>), so it has to be URL-safe and unique, and changing one breaks links already shared.
    it("gives every project a unique, URL-safe path", () => {
        const paths = PROJECTS.map(projectPath);
        expect(new Set(paths).size).toBe(PROJECTS.length);
        for (const path of paths) expect(path).toMatch(/^\/projects\/[a-z0-9-]+$/);
        expect(paths).toEqual(["/projects/pipeline", "/projects/solarcast", "/projects/neutrosurrogate"]);
    });

    it("lists every project page in the sitemap", () => {
        const sitemap = readFileSync(resolve(__dirname, "../../../public/sitemap.xml"), "utf8");
        for (const path of PROJECTS.map(projectPath)) {
            expect(sitemap).toContain(`<loc>https://krahler.com${path}</loc>`);
        }
    });

    // A tool a project leans on should also be in the Skills section, or the two pages disagree.
    it.each(["PyTorch", "SciPy", "Optuna", "XGBoost", "TensorFlow"])(
        "lists %s in Skills since a project's stack names it",
        (tool) => {
            expect(PROJECTS.some((p) => p.stack.includes(tool))).toBe(true);
            render(<Skills />);
            expect(screen.getByText(tool)).toBeInTheDocument();
        },
    );
});
