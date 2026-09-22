import { useState, type FormEvent } from "react";
import { API_BASE, COLD_START_TIMEOUT_MS } from "../scripts/api";
import { useApiStatus } from "../scripts/useApiStatus";

type SendState = "idle" | "sending" | "sent" | "error" | "rate-limited";

const WARMTH_LABEL: Record<string, string> = {
    checking: "Waking up the API...",
    warm: "API is live and responding.",
    unreachable:
        "API isn't responding right now, but the form still queues your message below.",
};

export default function Contact() {
    const warmth = useApiStatus();
    const [state, setState] = useState<SendState>("idle");
    // A field a person never sees or fills in. Any value here means a bot filled every field blindly, so it's the one case the API rejects outright rather than logging.
    const [website, setWebsite] = useState("");

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setState("sending");

        // React clears e.currentTarget once this handler's synchronous part returns, so it has to be captured before the first await rather than read again after the fetch resolves.
        const formEl = e.currentTarget;
        const form = new FormData(formEl);
        try {
            const res = await fetch(`${API_BASE}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // The Container App can still be cold here even after the warm-up ping, so this gets the same generous timeout.
                signal: AbortSignal.timeout(COLD_START_TIMEOUT_MS),
                body: JSON.stringify({
                    name: form.get("name"),
                    email: form.get("email"),
                    message: form.get("message"),
                    website,
                }),
            });

            if (res.status === 429) setState("rate-limited");
            else if (res.ok) {
                setState("sent");
                formEl.reset();
                setWebsite("");
            } else setState("error");
        } catch {
            setState("error");
        }
    }

    return (
        <section className="band" aria-labelledby="contact-heading">
            <h2 id="contact-heading" className="mb-2">
                Get in touch
            </h2>
            <p className="section-intro mb-1">
                Goes straight to a Spring Boot API on its own Azure Container
                App, not a form service.
            </p>
            <p className="freshness mb-4">{WARMTH_LABEL[warmth]}</p>

            {state === "sent" ? (
                <p className="work-empty">
                    Sent. I'll reply from{" "}
                    <a href="mailto:eliothkrahler@gmail.com">
                        eliothkrahler@gmail.com
                    </a>
                    .
                </p>
            ) : (
                <form onSubmit={onSubmit} noValidate>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="contact-name">
                            Name
                        </label>
                        <input
                            id="contact-name"
                            name="name"
                            className="form-control"
                            required
                            maxLength={100}
                            disabled={state === "sending"}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="contact-email">
                            Email
                        </label>
                        <input
                            id="contact-email"
                            name="email"
                            type="email"
                            className="form-control"
                            required
                            maxLength={200}
                            disabled={state === "sending"}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label" htmlFor="contact-message">
                            Message
                        </label>
                        <textarea
                            id="contact-message"
                            name="message"
                            className="form-control"
                            rows={4}
                            required
                            maxLength={2000}
                            disabled={state === "sending"}
                        />
                    </div>

                    {/* Hidden from people with CSS, not `type="hidden"`, so a bot's form-fill still targets it. */}
                    <div className="honeypot" aria-hidden="true">
                        <label htmlFor="contact-website">Website</label>
                        <input
                            id="contact-website"
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-outline-light"
                        disabled={state === "sending"}
                    >
                        {state === "sending" ? "Sending..." : "Send"}
                    </button>

                    {state === "sending" && (
                        <p className="freshness mt-3" role="status">
                            The API can take up to a minute to wake up from
                            idle. This isn't stuck.
                        </p>
                    )}
                    {state === "rate-limited" && (
                        <p className="freshness mt-3" role="alert">
                            That's the fifth message this hour from wherever
                            you're connecting from. Email me instead at{" "}
                            <a href="mailto:eliothkrahler@gmail.com">
                                eliothkrahler@gmail.com
                            </a>
                            .
                        </p>
                    )}
                    {state === "error" && (
                        <p className="freshness mt-3" role="alert">
                            That didn't go through. Email me instead at{" "}
                            <a href="mailto:eliothkrahler@gmail.com">
                                eliothkrahler@gmail.com
                            </a>
                            .
                        </p>
                    )}
                </form>
            )}
        </section>
    );
}
