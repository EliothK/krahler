import { render, screen } from "@testing-library/react";
import NotFound from "../../components/NotFound";

describe("NotFound", () => {
    it("says so in its one heading and offers a way back", () => {
        render(<NotFound />);
        expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
        expect(screen.getByRole("link", { name: "The portfolio" })).toHaveAttribute("href", "/");
        expect(screen.getByRole("link", { name: /how this site is built/i })).toHaveAttribute("href", "/build");
    });

    it("sets the document title while shown and restores it after", () => {
        document.title = "before";
        const { unmount } = render(<NotFound />);
        expect(document.title).toBe("Page not found - Elioth Krahler");
        unmount();
        expect(document.title).toBe("before");
    });
});
