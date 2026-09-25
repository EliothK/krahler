import { render, screen, within } from "@testing-library/react";
import PipelineFlow from "../../components/PipelineFlow";

describe("PipelineFlow", () => {
    it("shows the three lanes as headed, ordered lists", () => {
        render(<PipelineFlow />);
        for (const lane of [/every pull request/i, /after merge to main/i, /on a schedule/i]) {
            const heading = screen.getByRole("heading", { name: lane });
            const list = heading.nextElementSibling;
            expect(list.tagName).toBe("OL");
            expect(within(list).getAllByRole("listitem").length).toBeGreaterThan(1);
        }
    });

    it("keeps the steps in the order a change actually takes", () => {
        render(<PipelineFlow />);
        const pr = screen.getByRole("heading", { name: /every pull request/i }).nextElementSibling;
        const titles = within(pr).getAllByRole("listitem").map((li) => li.querySelector(".flow-title").textContent);
        expect(titles.indexOf("CI")).toBeLessThan(titles.indexOf("Staging"));
        expect(titles.indexOf("Staging")).toBeLessThan(titles.indexOf("Staging checks"));

        const merge = screen.getByRole("heading", { name: /after merge/i }).nextElementSibling;
        const mergeTitles = within(merge).getAllByRole("listitem").map((li) => li.querySelector(".flow-title").textContent);
        expect(mergeTitles).toEqual(["Approval", "Apply", "Deploy", "Live checks"]);
    });

    it("marks the gates, and only the gates", () => {
        const { container } = render(<PipelineFlow />);
        const gates = [...container.querySelectorAll(".flow-gate .flow-title")].map((el) => el.textContent);
        expect(gates).toEqual(["Staging checks", "Approval", "Live checks"]);
    });
});
