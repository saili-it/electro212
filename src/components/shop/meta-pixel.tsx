"use client";

import Script from "next/script";
import { useEffect } from "react";
import { META_PIXEL_ID, contact, contactMethodOf } from "@/lib/meta";

/** One delegated listener: any click on a tel:, wa.me or api.whatsapp.com link sends Contact. */
function ContactClicks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const method = link ? contactMethodOf(link.getAttribute("href") ?? "") : null;
      if (method) contact(method);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}

/**
 * Meta (Facebook) Pixel for the storefront — mounted once in the (shop) layout, so the admin is never
 * tracked. Base code via next/script `afterInteractive` (init + first PageView), <noscript> fallback,
 * and Contact on WhatsApp/phone clicks. Page views on client navigations come from <PageViewTracker>;
 * e-commerce events are sent from the pages through lib/meta.ts.
 */
export function MetaPixel() {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel fallback, not content */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
      <ContactClicks />
    </>
  );
}
