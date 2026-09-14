import { render, screen } from "@testing-library/react";
import Skills from "../../components/Skills";

describe("Skills", () => {
    it("renders the section heading", () => {
        render(<Skills />);
        expect(
            screen.getByRole("heading", { level: 2, name: "Skills" }),
        ).toBeInTheDocument();
    });

    it("renders each tier heading", () => {
        render(<Skills />);
        expect(
            screen.getByText("Built production or graded work with"),
        ).toBeInTheDocument();
        expect(
            screen.getByText("Coursework and certified fundamentals"),
        ).toBeInTheDocument();
        expect(screen.getByText("Added during this project")).toBeInTheDocument();
    });

    it("renders skills from each tier", () => {
        render(<Skills />);
        expect(screen.getByText("Java")).toBeInTheDocument();
        expect(screen.getByText("Kubernetes / AKS")).toBeInTheDocument();
    });

    it("renders the caveat only on the tier that has one", () => {
        render(<Skills />);
        expect(
            screen.getByText(/These are four weeks old/),
        ).toBeInTheDocument();
    });
});
