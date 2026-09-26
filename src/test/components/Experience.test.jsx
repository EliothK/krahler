import { render, screen } from "@testing-library/react";
import Experience from "../../components/Experience";

describe("Experience", () => {
    it("renders the section heading", () => {
        render(<Experience />);
        expect(
            screen.getByRole("heading", { level: 2, name: "Experience" }),
        ).toBeInTheDocument();
    });

    it("renders both entries", () => {
        render(<Experience />);
        expect(
            screen.getByText(/Resource Revolution: Refresh Technician/),
        ).toBeInTheDocument();
        expect(screen.getByText("DoorDash")).toBeInTheDocument();
    });
});
