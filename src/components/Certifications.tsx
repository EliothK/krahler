const CERTS = [
    "WGU AI Optimization Developer",
    "WGU Java Developer",
    "LPI Linux Essentials",
    "ITIL 4 Foundations",
];

export default function Certifications() {
    return (
        <section className="band" aria-labelledby="certs-heading">
            <h2 id="certs-heading" className="mb-2">
                Certifications
            </h2>

            <ul className="certs mb-4">
                {CERTS.map((c) => (
                    <li key={c}>{c}</li>
                ))}
            </ul>
        </section>
    );
}
