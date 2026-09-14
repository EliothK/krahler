import { render, screen } from "@testing-library/react";
import ProfileCard from "../../components/ProfileCard";

describe("ProfileCard", () => {
    it("renders the name as an h1", () => {
        render(<ProfileCard />);
        expect(
            screen.getByRole("heading", { level: 1, name: "Elioth Krahler" }),
        ).toBeInTheDocument();
    });

    it("links to GitHub, email, and the build page", () => {
        render(<ProfileCard />);
        const links = screen.getAllByRole("link");
        const hrefs = links.map((l) => l.getAttribute("href"));
        expect(hrefs.some((h) => h?.startsWith("https://github.com/"))).toBe(
            true,
        );
        expect(hrefs.some((h) => h?.startsWith("mailto:"))).toBe(true);
        expect(hrefs).toContain("/build");
    });

    it("renders the profile photo with alt text", () => {
        render(<ProfileCard />);
        expect(screen.getByAltText("Elioth Krahler")).toBeInTheDocument();
    });
});
