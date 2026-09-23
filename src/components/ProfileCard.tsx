// Served from GitHub so the photo does not have to live in the repo. Keep the CSP img-src (public/staticwebapp.config.json; lab/security.conf for the AKS lab) and the preload in index.html in sync.
const PROFILE_PIC = "https://avatars.githubusercontent.com/u/175250448?v=4&s=320";

const GITHUB_USER = import.meta.env.VITE_GITHUB_USER || "EliothK";
const CONTACT_EMAIL =
    import.meta.env.VITE_CONTACT_EMAIL || "eliothkrahler@gmail.com";

const LINKS = [
    {
        href: `https://github.com/${GITHUB_USER}`,
        label: "GitHub",
        hint: "Source for everything below",
    },
    {
        href: `mailto:${CONTACT_EMAIL}`,
        label: `Email me @ ${CONTACT_EMAIL}`,
        hint: "Fastest way to reach me",
    },
    {
        href: "/build",
        label: "How this site gets deployed",
        hint: "From Kubernetes to static hosting, with the build log",
    },
];

function ProfileCard() {
    return (
        <div className="profile-sticky">
            <div className="profile-card p-4 p-lg-4">
                <img
                    className="profile-photo mb-1"
                    src={PROFILE_PIC}
                    fetchPriority="high"
                    alt="Elioth Krahler"
                    width={360}
                    height={360}
                />

                <h1 className="profile-name mb-2">Elioth Krahler</h1>

                <p className="profile-blurb quiet mb-3">
                    CS graduate in Bismarck, ND. I build forecasting systems and
                    the delivery pipelines that put them in production.
                </p>

                <p className="profile-status mb-3">
                    <span className="status-dot" aria-hidden="true" />
                    Open to DevOps, Fullstack, and backend roles
                </p>
                <p className="profile-blurb quiet mb-3">
                    Looking for remote work, and open to relocating.
                </p>
                <ul className="profile-links rule-top">
                    {LINKS.map((l) => (
                        <li key={l.href}>
                            <a
                                href={l.href}
                                {...(l.href.startsWith("mailto:")
                                    ? {}
                                    : {
                                          target: "_blank",
                                          rel: "noopener noreferrer",
                                      })}
                            >
                                {l.label}
                                <span className="hint">{l.hint}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default ProfileCard;
