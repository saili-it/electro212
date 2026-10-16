import type { ReactNode } from "react";

// Line icons for the main categories, used until a category photo is uploaded.
const ICONS: Record<string, ReactNode> = {
  "tv-et-accessoires": (
    <>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  "gros-electromenager": (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M6 10h12M9 5v2.5M9 13v3" />
    </>
  ),
  "petit-electromenager": (
    <>
      <path d="M8 3h8l-1.2 8.5H9.2L8 3Z" />
      <rect x="7" y="11.5" width="10" height="9.5" rx="2" />
      <circle cx="12" cy="16.25" r="1.5" />
    </>
  ),
  "confort-de-la-maison": (
    <>
      <rect x="2" y="4" width="20" height="9" rx="2" />
      <path d="M6 10h12M8 16.5l-1 3M12 16.5v3M16 16.5l1 3" />
    </>
  ),
  encastrable: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 8h18" />
      <rect x="7" y="11" width="10" height="6.5" rx="1" />
      <path d="M7 5.5h.01M10 5.5h.01M13 5.5h.01" />
    </>
  ),
  "meuble-tv": (
    <>
      <rect x="7" y="2.5" width="10" height="6.5" rx="1" />
      <path d="M12 9v2" />
      <rect x="2" y="11" width="20" height="8" rx="1" />
      <path d="M12 11v8M6 19v2M18 19v2" />
    </>
  ),
};

export function CategoryIcon({ slug, className = "h-10 w-10" }: { slug: string; className?: string }) {
  const icon = ICONS[slug];
  if (!icon) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 12h8" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {icon}
    </svg>
  );
}
