import profilePic from "../assets/IandNoWest.webp";

const GITHUB_USER = import.meta.env.VITE_GITHUB_USER ?? "eliothkrahler";
const CONTACT_EMAIL =
    import.meta.env.VITE_CONTACT_EMAIL ?? "eliothkrahler@gmail.com";

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
        hint: "Actions -> Terraform -> AKS, with the build log",
    },
];

function ProfileCard() {
    return (
        <div className="profile-sticky">
            <div className="profile-card p-3 p-lg-4">
                <img
                    className="profile-photo mb-3"
                    src={profilePic}
                    alt="Elioth Krahler"
                    width={130}
                    height={130}
                />

                <h1 className="mb-2">Elioth Krahler</h1>

                <p className="profile-blurb quiet mb-3">
                    CS graduate in Bismarck, ND. I build forecasting systems and
                    the delivery pipelines that put them in production.
                </p>

                <p className="profile-status mb-3">
                    <span className="status-dot" aria-hidden="true" />
                    Open to DevOps, Fullstack, and backend roles
                </p>
                <ul className="profile-links rule-top">
                    {LINKS.map((l) => (
                        <li key={l.href}>
                            <a href={l.href}>
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
