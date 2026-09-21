import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "../scss/custom.scss";
import Routes from "./Routes.tsx";

import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-mono/400.css";

const root = document.getElementById("root")!;
const app = (
    <StrictMode>
        <Routes path={window.location.pathname} />
    </StrictMode>
);

// The production build ships prerendered HTML, so attach to it. `npm run dev` serves an empty root, so render from scratch.
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
