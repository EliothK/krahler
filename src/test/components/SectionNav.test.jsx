import { act, render, screen } from "@testing-library/react";
import { vi, afterEach, describe, it, expect } from "vitest";
import SectionNav from "../../components/SectionNav";

describe("SectionNav", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("links to every home-page section", () => {
        render(<SectionNav />);
        const nav = screen.getByRole("navigation", { name: /on this page/i });
        const links = nav.querySelectorAll("a");
        expect(Array.from(links).map((a) => a.getAttribute("href"))).toEqual([
            "#projects-heading",
            "#work-heading",
            "#skills-heading",
            "#experience-heading",
            "#certs-heading",
            "#contact-heading",
        ]);
    });

    it("marks the section the reader has scrolled to", () => {
        let callback;
        vi.stubGlobal(
            "IntersectionObserver",
            class {
                constructor(cb) {
                    callback = cb;
                }
                observe() {}
                disconnect() {}
            },
        );

        const section = document.createElement("section");
        section.innerHTML = '<h2 id="skills-heading">Skills</h2>';
        document.body.appendChild(section);

        render(<SectionNav />);
        act(() => callback([{ isIntersecting: true, target: section }]));

        expect(screen.getByRole("link", { name: "Skills" })).toHaveAttribute(
            "aria-current",
            "location",
        );
        expect(screen.getByRole("link", { name: "Projects" })).not.toHaveAttribute(
            "aria-current",
        );
    });
});
