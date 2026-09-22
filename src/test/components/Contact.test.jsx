import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, afterEach } from "vitest";
import Contact from "../../components/Contact";

describe("Contact", () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    // Routes by URL rather than call order: the warm-up ping and the submit share one mock, and the timing between them isn't something this test should have to pin down.
    function mockSubmitResult(submitResponse) {
        fetchSpy.mockImplementation((url) =>
            url.includes("/api/contact")
                ? Promise.resolve(submitResponse)
                : Promise.resolve({ ok: true }),
        );
    }

    function fillForm() {
        return {
            name: screen.getByLabelText("Name"),
            email: screen.getByLabelText("Email"),
            message: screen.getByLabelText("Message"),
        };
    }

    async function submit(user) {
        const { name, email, message } = fillForm();
        await user.type(name, "Ada");
        await user.type(email, "ada@example.com");
        await user.type(message, "Hello there");
        await user.click(screen.getByRole("button", { name: /send/i }));
    }

    it("pings /api/status on mount to warm the API up", () => {
        fetchSpy.mockReturnValue(new Promise(() => {}));
        render(<Contact />);
        expect(fetchSpy).toHaveBeenCalledWith(
            expect.stringContaining("/api/status"),
            expect.any(Object),
        );
    });

    it("shows a sending state and success message on a good response", async () => {
        const user = userEvent.setup();
        mockSubmitResult({ ok: true });
        render(<Contact />);

        await submit(user);

        await waitFor(() => expect(screen.getByText(/^Sent\./)).toBeInTheDocument());

        const submitCall = fetchSpy.mock.calls.find((c) => c[0].includes("/api/contact"));
        const body = JSON.parse(submitCall[1].body);
        expect(body).toMatchObject({
            name: "Ada",
            email: "ada@example.com",
            message: "Hello there",
            website: "",
        });
    });

    it("shows a rate-limit message on 429", async () => {
        const user = userEvent.setup();
        mockSubmitResult({ ok: false, status: 429 });
        render(<Contact />);

        await submit(user);

        await waitFor(() =>
            expect(screen.getByText(/fifth message this hour/)).toBeInTheDocument(),
        );
    });

    it("shows an error message when the request fails", async () => {
        const user = userEvent.setup();
        fetchSpy.mockImplementation((url) =>
            url.includes("/api/contact")
                ? Promise.reject(new Error("boom"))
                : Promise.resolve({ ok: true }),
        );
        render(<Contact />);

        await submit(user);

        await waitFor(() =>
            expect(screen.getByText(/didn't go through/)).toBeInTheDocument(),
        );
    });

    it("keeps the honeypot field out of the tab order", () => {
        fetchSpy.mockReturnValue(new Promise(() => {}));
        render(<Contact />);
        expect(screen.getByLabelText("Website")).toHaveAttribute("tabindex", "-1");
    });
});
