import { render, screen } from "@testing-library/react";
import ProfileCard from "../../components/ProfileCard";

describe("ProfileCard", () => {
    it("renders the name as an h1", () => {
        render(<ProfileCard />);
        expect(
            screen.getByRole("heading", { level: 1, name: "Elioth Krahler" }),
        ).toBeInTheDocument();
    });

    it("links to GitHub, LinkedIn, email, and the build page", () => {
        render(<ProfileCard />);
        const links = screen.getAllByRole("link");
        const hrefs = links.map((l) => l.getAttribute("href"));
        expect(hrefs.some((h) => h?.startsWith("https://github.com/"))).toBe(
            true,
        );
        expect(
            hrefs.some((h) => h?.startsWith("https://www.linkedin.com/in/")),
        ).toBe(true);
        expect(hrefs.some((h) => h?.startsWith("mailto:"))).toBe(true);
        expect(hrefs).toContain("/build");
    });

    it("opens the build log in the same tab and other sites in a new one", () => {
        render(<ProfileCard />);
        const build = screen.getByRole("link", { name: /how this site is built and run/i });
        expect(build).toHaveAttribute("href", "/build");
        expect(build).not.toHaveAttribute("target");
        const github = screen.getAllByRole("link").find((l) => l.getAttribute("href")?.startsWith("https://github.com/"));
        expect(github).toHaveAttribute("target", "_blank");
        expect(github).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders the profile photo with alt text", () => {
        render(<ProfileCard />);
        expect(screen.getByAltText("Elioth Krahler")).toBeInTheDocument();
    });

    it("loads the photo from GitHub avatars, not a bundled file", () => {
        render(<ProfileCard />);
        expect(screen.getByAltText("Elioth Krahler")).toHaveAttribute(
            "src",
            expect.stringMatching(/^https:\/\/avatars\.githubusercontent\.com\//),
        );
    });
});
