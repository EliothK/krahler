import SectionNav from "./SectionNav";

// Served from GitHub so the photo does not have to live in the repo. Keep the CSP img-src (public/staticwebapp.config.json; lab/security.conf for the AKS lab) in sync.
const AVATAR = "https://avatars.githubusercontent.com/u/175250448?v=4";
const PROFILE_PIC = `${AVATAR}&s=320`;
// GitHub resizes on the s= parameter. The photo shows at 72px on phones, 120px on tablets and up to 240px on desktop, so a phone shouldn't download the 150 KB desktop size.
const PROFILE_SRCSET = `${AVATAR}&s=160 160w, ${AVATAR}&s=240 240w, ${AVATAR}&s=320 320w`;
const PROFILE_SIZES = "(min-width: 992px) 240px, (min-width: 768px) 120px, 72px";

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
        href: "https://www.linkedin.com/in/elioth-krahler-a9215843a/",
        label: "LinkedIn",
        hint: "Work history and background",
    },
    {
        href: "/Elioth-Krahler-Resume.pdf",
        label: "Résumé (PDF)",
        hint: "Two pages, ML engineering to DevOps",
    },
    {
        href: `mailto:${CONTACT_EMAIL}`,
        label: `Email me @ ${CONTACT_EMAIL}`,
        hint: "Fastest way to reach me",
    },
    {
        href: "/build",
        label: "How this site is built and run",
        hint: "Architecture, pipeline and the bugs I fixed",
    },
];

// Three regions (photo, identity, links) that the stylesheet rearranges per screen size: a compact header on phones, a horizontal strip on tablets, a sticky column on desktop.
function ProfileCard() {
    return (
        <div className="profile-sticky">
            <div className="profile-card">
                {/* In a <picture> only so React's server render doesn't add its own preload for the photo: that preload picked the wrong srcset size on phones and the photo downloaded twice. */}
                <picture>
                    <source srcSet={PROFILE_SRCSET} sizes={PROFILE_SIZES} />
                    <img
                        className="profile-photo"
                        src={PROFILE_PIC}
                        fetchPriority="high"
                        alt="Elioth Krahler"
                        width={360}
                        height={360}
                    />
                </picture>

                <div className="profile-id">
                    <h1 className="profile-name mb-2">Elioth Krahler</h1>

                    <p className="profile-blurb quiet mb-2">
                        CS graduate in Bismarck, ND. I build forecasting systems
                        and the delivery pipelines that put them in production.
                    </p>

                    <p className="profile-status mb-2">
                        <span className="status-dot" aria-hidden="true" />
                        Open to ML engineer, DevOps, Fullstack, and backend roles
                    </p>
                    <p className="profile-blurb quiet mb-0">
                        Looking for remote work, and open to relocating.
                    </p>
                </div>
                <ul className="profile-links">
                    {LINKS.map((l) => (
                        <li key={l.href}>
                            <a
                                href={l.href}
                                // Only other sites open in a new tab; email and pages on this site behave like normal links.
                                {...(l.href.startsWith("mailto:") || l.href.startsWith("/")
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
            <SectionNav />
        </div>
    );
}

export default ProfileCard;
