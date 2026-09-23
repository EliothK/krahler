import App from "./App";
import BuildLog from "./components/BuildLog";
import ReadProgress from "./components/ReadProgress";

// Shared by the browser entry (main.tsx) and the build-time prerender (entry-server.tsx), so both render the same tree for a given path.
export const BUILD_PATH = "/build";

export default function Routes({ path }: { path: string }) {
    return (
        <>
            <ReadProgress />
            {path.replace(/\/$/, "") === BUILD_PATH ? <BuildLog /> : <App />}
        </>
    );
}
