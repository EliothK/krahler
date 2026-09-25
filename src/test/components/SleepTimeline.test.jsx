import { render, screen } from "@testing-library/react";
import SleepTimeline from "../../components/SleepTimeline";

describe("SleepTimeline", () => {
    it("hides the drawing from screen readers and gives them a text summary instead", () => {
        const { container } = render(<SleepTimeline />);
        expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
        expect(screen.getByText(/never reached 60 idle minutes/i)).toBeInTheDocument();
    });

    it("draws a connection on every cold start before the fix, and only one after", () => {
        const { container } = render(<SleepTimeline />);
        const [before, after] = container.querySelectorAll("svg > g:not(:has(> line.tl-axis))");
        const startsBefore = before.querySelectorAll(".tl-start").length;
        expect(startsBefore).toBeGreaterThan(5);
        expect(before.querySelectorAll(".tl-connection")).toHaveLength(startsBefore);
        expect(after.querySelectorAll(".tl-start")).toHaveLength(startsBefore);
        expect(after.querySelectorAll(".tl-connection")).toHaveLength(1);
    });

    it("only shows the database paused after the fix, 60 minutes after the last connection", () => {
        const { container } = render(<SleepTimeline />);
        const [before, after] = container.querySelectorAll("svg > g:not(:has(> line.tl-axis))");
        expect(before.querySelector(".tl-paused")).toBeNull();
        const paused = after.querySelector(".tl-paused");
        const connection = after.querySelector(".tl-connection");
        // 3 px per minute in the drawing.
        expect((Number(paused.getAttribute("x")) - Number(connection.getAttribute("cx"))) / 3).toBe(60);
    });
});
