"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * The header dropdowns open on hover/focus (CSS). After a client-side
 * navigation the clicked link keeps focus, so its `focus-within` panel would
 * stay open on the new page — this drops focus and closes any open <details>
 * (mobile menu) whenever the path changes.
 */
export function CloseMenusOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    document.querySelectorAll<HTMLDetailsElement>("header details[open]").forEach((details) => {
      details.open = false;
    });
  }, [pathname]);

  return null;
}
