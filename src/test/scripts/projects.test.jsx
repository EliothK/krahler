import { render, screen } from "@testing-library/react";
import Skills from "../../components/Skills";
import { PROJECTS } from "../../scripts/projects";

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

    it("NeutroSurrogate reports the model combination result", () => {
        expect(allText("neutro")).toMatch(/largest k-eff/i);
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
