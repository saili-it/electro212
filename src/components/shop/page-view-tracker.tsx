"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { pageView } from "@/lib/meta";

/**
 * Sends a page view (Meta PageView + GTM virtual_page_view) on client-side navigations — pathname or
 * query string — never on first load: the Meta and GTM base codes already track that one. Comparing
 * against the last tracked URL (not a "first run" flag) also keeps React strict mode from duplicating it.
 */
function OnNavigate() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;
  const lastUrl = useRef(url);

  useEffect(() => {
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    pageView();
  }, [url]);

  return null;
}

export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <OnNavigate />
    </Suspense>
  );
}
