import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import ProjectCarousel from "../../components/ProjectCarousel";
import { PROJECTS } from "../../scripts/projects";

describe("ProjectCarousel", () => {
    it("renders a card for every project", () => {
        render(<ProjectCarousel onOpen={() => {}} />);
        for (const p of PROJECTS) {
            expect(screen.getByText(p.title)).toBeInTheDocument();
        }
    });

    it("shows the total project count", () => {
        render(<ProjectCarousel onOpen={() => {}} />);
        expect(
            screen.getByText(new RegExp(`/ ${PROJECTS.length}$`)),
        ).toBeInTheDocument();
    });

    it("calls onOpen with the clicked project", () => {
        const onOpen = vi.fn();
        render(<ProjectCarousel onOpen={onOpen} />);
        fireEvent.click(screen.getByText(PROJECTS[0].title));
        expect(onOpen).toHaveBeenCalledWith(PROJECTS[0]);
    });

    it("disables the previous button at the start", () => {
        render(<ProjectCarousel onOpen={() => {}} />);
        expect(
            screen.getByRole("button", { name: "Previous projects" }),
        ).toBeDisabled();
    });

    it("shows a pending figure placeholder when figure is unset", () => {
        const project = PROJECTS[0];
        const original = { figure: project.figure, figurePending: project.figurePending };
        project.figure = null;
        project.figurePending = "median error, pending";
        try {
            render(<ProjectCarousel onOpen={() => {}} />);
            expect(screen.getByText("median error, pending")).toBeInTheDocument();
        } finally {
            Object.assign(project, original);
        }
    });
});
