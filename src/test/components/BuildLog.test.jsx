import { render, screen } from "@testing-library/react";
import BuildLog from "../../components/BuildLog";

describe("BuildLog", () => {
    it("renders exactly one h1 and a way back", () => {
        render(<BuildLog />);
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
        expect(screen.getByRole("link", { name: /back to the portfolio/i })).toHaveAttribute("href", "/");
    });

    it("sets the document title", () => {
        render(<BuildLog />);
        expect(document.title).toMatch(/build log/i);
    });
});
