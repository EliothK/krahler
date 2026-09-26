import { renderToString } from "react-dom/server";
import Routes from "./Routes";
import { PROJECTS, projectPageTitle, projectPath } from "./scripts/projects";

// Built with `vite build --ssr` and called by scripts/prerender.mjs, so the HTML a crawler downloads already contains the page.
export function render(path: string) {
    return renderToString(<Routes path={path} />);
}

// One prerendered page per project write-up, read by scripts/prerender.mjs so the project list lives in one place.
export const projectRoutes = PROJECTS.map((p) => ({
    path: projectPath(p),
    file: `${projectPath(p).slice(1)}/index.html`,
    title: projectPageTitle(p),
    description: p.summary,
    canonical: `https://krahler.com${projectPath(p)}`,
}));
