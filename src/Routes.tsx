import App from "./App";
import BuildLog from "./components/BuildLog";
import NotFound from "./components/NotFound";
import ReadProgress from "./components/ReadProgress";

// Shared by the browser entry (main.tsx) and the build-time prerender (entry-server.tsx), so both render the same tree for a given path.
export const BUILD_PATH = "/build";

// Any other path is not a page. The prerendered 404.html is served for it with a 404 status, and this makes the browser render the same thing when it hydrates.
function page(path: string) {
    const clean = path.replace(/\/$/, "");
    if (clean === "" || clean === "/index.html") return <App />;
    if (clean === BUILD_PATH) return <BuildLog />;
    return <NotFound />;
}

export default function Routes({ path }: { path: string }) {
    return (
        <>
            <ReadProgress />
            {page(path)}
        </>
    );
}
