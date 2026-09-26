import { render, screen } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import Routes from "../Routes";

describe("Routes", () => {
    beforeEach(() => {
        // The home page and the build log both call the API on mount.
        vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const heading = () => screen.getByRole("heading", { level: 1 });

    it.each(["/", "", "/index.html"])("renders the portfolio for %j", (path) => {
        render(<Routes path={path} />);
        expect(heading()).toHaveTextContent("Elioth Krahler");
    });

    it.each(["/build", "/build/"])("renders the build log for %j", (path) => {
        render(<Routes path={path} />);
        expect(heading()).toHaveTextContent("Build log");
    });

    it.each([
        ["/projects/pipeline", "This site's delivery pipeline"],
        ["/projects/solarcast", "SolarCast"],
        ["/projects/neutrosurrogate/", "NeutroSurrogate"],
    ])("renders the project page for %j", (path, title) => {
        render(<Routes path={path} />);
        expect(heading()).toHaveTextContent(title);
    });

    it.each(["/404", "/no-such-page", "/build/extra", "/builds", "/BUILD", "/projects", "/projects/neutro", "/projects/solarcast/extra"])(
        "renders the not-found page for %j",
        (path) => {
            render(<Routes path={path} />);
            expect(heading()).toHaveTextContent("Page not found");
        },
    );
});
