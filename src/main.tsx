import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../scss/custom.scss";
import App from "./App.tsx";
import BuildLog from "./components/BuildLog.tsx";

import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-mono/400.css";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {window.location.pathname.replace(/\/$/, "") === "/build" ? (
            <BuildLog />
        ) : (
            <App />
        )}
    </StrictMode>,
);
