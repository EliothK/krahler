import { render, screen, fireEvent } from "@testing-library/react";
import { vi, beforeAll } from "vitest";
import ProjectDialog from "../../components/ProjectDialog";

beforeAll(() => {
    // jsdom does not implement <dialog>'s modal methods.
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = function () {
            this.open = true;
        };
    }
    if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = function () {
            this.open = false;
        };
    }
});

const project = {
    id: "test-proj",
    title: "Test Project",
    stack: "Test Stack",
    summary: "summary",
    figure: null,
    figureAccent: "flux",
    figureLabel: "label",
    program: ["program paragraph"],
    autopsy: ["autopsy paragraph"],
    next: ["next paragraph"],
    links: [{ label: "Repo", href: "https://example.com/repo" }],
};

describe("ProjectDialog", () => {
    it("renders nothing when no project is given", () => {
        const { container } = render(
            <ProjectDialog project={null} onClose={() => {}} />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("renders the project's title, stack, and sections when given a project", () => {
        render(<ProjectDialog project={project} onClose={() => {}} />);
        expect(
            screen.getByRole("heading", { level: 3, name: "Test Project" }),
        ).toBeInTheDocument();
        expect(screen.getByText("Test Stack")).toBeInTheDocument();
        expect(screen.getByText("program paragraph")).toBeInTheDocument();
        expect(screen.getByText("autopsy paragraph")).toBeInTheDocument();
        expect(screen.getByText("next paragraph")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Repo" })).toHaveAttribute(
            "href",
            "https://example.com/repo",
        );
    });

    it("omits the links section when the project has no links", () => {
        const { links, ...noLinks } = project;
        void links;
        render(<ProjectDialog project={noLinks} onClose={() => {}} />);
        expect(screen.queryByText("Read the code")).not.toBeInTheDocument();
    });

    it("calls onClose when the close button is clicked", () => {
        const onClose = vi.fn();
        render(<ProjectDialog project={project} onClose={onClose} />);
        fireEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalled();
    });
});
