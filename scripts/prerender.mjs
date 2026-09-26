// Runs after `vite build` and `vite build --ssr`: renders each route to HTML and writes it into dist/, so crawlers, link unfurlers and résumé parsers see the content without running JavaScript.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const dist = "dist";
const { render, projectRoutes } = await import(pathToFileURL(join("dist-ssr", "entry-server.js")).href);
const template = await readFile(join(dist, "index.html"), "utf8");

const routes = [
    { path: "/", file: "index.html" },
    {
        path: "/build",
        file: join("build", "index.html"),
        title: "Build log - Elioth Krahler",
        description: "How this site is built, deployed and tested, and why it moved off AKS.",
        canonical: "https://krahler.com/build",
    },
    ...projectRoutes,
    // Served by Static Web Apps, with a 404 status, for any path that isn't a page (responseOverrides in staticwebapp.config.json).
    // Any path Routes doesn't know renders the not-found page; "/404" is just a name for it here.
    {
        path: "/404",
        file: "404.html",
        title: "Page not found - Elioth Krahler",
        description: "There is no page at this address.",
        noindex: true,
    },
];

for (const route of routes) {
    let html = template.replace('<div id="root"></div>', `<div id="root">${render(route.path)}</div>`);
    if (route.title) {
        html = html
            .replace(/<title>.*?<\/title>/, `<title>${route.title}</title>`)
            .replace(/(<meta\s+name="description"\s+content=")[^"]*"/, `$1${route.description}"`)
            .replace(/(<meta property="og:title" content=")[^"]*"/, `$1${route.title}"`)
            .replace(/(<meta\s+property="og:description"\s+content=")[^"]*"/, `$1${route.description}"`)
            .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/, "");
        html = route.noindex
            ? html
                  .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/?>/, "")
                  .replace(/(<meta property="og:url" content=")[^"]*"/, '$1https://krahler.com"')
                  .replace("</head>", '    <meta name="robots" content="noindex" />\n  </head>')
            : html
                  .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${route.canonical}"`)
                  .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${route.canonical}"`);
    }
    if (html === template) throw new Error(`prerender changed nothing for ${route.path}`);
    const out = join(dist, route.file);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, html);
    console.log(`prerendered ${route.path} -> ${out} (${html.length} bytes)`);
}
