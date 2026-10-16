"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

/**
 * Fades + slides its children in when they scroll into view. It's purely
 * additive: the content renders normally, and the animation only kicks in when
 * JS has set `data-anim` on <html> and the visitor hasn't asked for reduced
 * motion (both handled in globals.css). Variants via `className`:
 * `reveal-left` (slide from the left) or `reveal-zoom` (scale up).
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || el.classList.contains("is-visible")) return;
    // Nothing to do when the reveal styles aren't active (no JS gate / reduced motion).
    if (!document.documentElement.hasAttribute("data-anim")) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const style = delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined;

  return (
    <div ref={ref} className={`reveal ${className}`} style={style}>
      {children}
    </div>
  );
}
