import { useEffect } from "react";

// Served for any path that isn't a page, with a real 404 status (see public/staticwebapp.config.json), so crawlers don't index a stray URL as a copy of the home page.
export default function NotFound() {
    useEffect(() => {
        const previous = document.title;
        document.title = "Page not found - Elioth Krahler";
        return () => {
            document.title = previous;
        };
    }, []);

    return (
        <div className="container-xl py-4 py-lg-5">
            <main id="main">
                <header className="pb-4">
                    <h1 className="lede mb-3">Page not found</h1>
                    <p className="quiet lede-sub">
                        Nothing lives at this address. It may have moved, or the
                        link may have a typo.
                    </p>
                </header>
                <ul className="not-found-links">
                    <li>
                        <a href="/">The portfolio</a>
                    </li>
                    <li>
                        <a href="/build">How this site is built and run</a>
                    </li>
                </ul>
            </main>
        </div>
    );
}
