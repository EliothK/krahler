import { renderToString } from "react-dom/server";
import Routes from "./Routes";

// Built with `vite build --ssr` and called by scripts/prerender.mjs, so the HTML a crawler downloads already contains the page.
export function render(path: string) {
    return renderToString(<Routes path={path} />);
}
