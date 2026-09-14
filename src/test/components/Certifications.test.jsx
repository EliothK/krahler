import { render, screen } from "@testing-library/react";
import Certifications from "../../components/Certifications";

describe("Certifications", () => {
    it("renders the section heading", () => {
        render(<Certifications />);
        expect(
            screen.getByRole("heading", { level: 2, name: "Certifications" }),
        ).toBeInTheDocument();
    });

    it("renders every certification as a list item", () => {
        render(<Certifications />);
        const items = screen.getAllByRole("listitem");
        expect(items).toHaveLength(4);
        expect(screen.getByText("WGU AI Optimization Developer")).toBeInTheDocument();
        expect(screen.getByText("ITIL 4 Foundations")).toBeInTheDocument();
    });
});
