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
        expect(screen.getByText("Learned by building this site")).toBeInTheDocument();
    });

    it("renders skills from each tier", () => {
        render(<Skills />);
        expect(screen.getByText("Java")).toBeInTheDocument();
        expect(screen.getByText("Kubernetes / AKS")).toBeInTheDocument();
    });

    it("links each newer skill to a file in the repo", () => {
        render(<Skills />);
        const link = screen.getByRole("link", { name: "GitHub Actions" });
        expect(link.getAttribute("href")).toBe(
            "https://github.com/EliothK/krahler/blob/main/.github/workflows/deploy.yml",
        );
        for (const name of ["Terraform", "Kubernetes / AKS", "Azure Monitor"]) {
            expect(
                screen.getByRole("link", { name }).getAttribute("href"),
            ).toContain("https://github.com/EliothK/krahler/");
        }
    });

    it("renders the caveat only on the tier that has one, without a stale age", () => {
        render(<Skills />);
        expect(screen.getByText(/newer to me than the rest/)).toBeInTheDocument();
        expect(screen.queryByText(/weeks old/)).toBeNull();
    });
});
