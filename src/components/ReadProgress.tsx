import { useEffect, useRef } from "react";

// The sheen rule across the top, scaled to how far down the page the reader is. Driven by a scroll listener instead of a CSS scroll timeline so it works in every browser (Firefox has no scroll timelines), and it stays on under reduced motion because it only moves when the reader scrolls.
export default function ReadProgress() {
    const bar = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            const root = document.documentElement;
            const max = root.scrollHeight - root.clientHeight;
            const progress = max > 0 ? Math.min(1, Math.max(0, root.scrollTop / max)) : 1;
            if (bar.current) bar.current.style.transform = `scaleX(${0.02 + 0.98 * progress})`;
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        addEventListener("scroll", schedule, { passive: true });
        addEventListener("resize", schedule);
        // The page grows after load (activity feed, status panel), which changes the scroll range without a scroll or resize event.
        const grow = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
        grow?.observe(document.body);

        return () => {
            removeEventListener("scroll", schedule);
            removeEventListener("resize", schedule);
            grow?.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    return <div ref={bar} className="read-progress" aria-hidden="true" />;
}
