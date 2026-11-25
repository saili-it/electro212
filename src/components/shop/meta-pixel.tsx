"use client";

import Script from "next/script";
import { useEffect } from "react";
import { META_PIXEL_ID, contact, contactMethodOf, contactSourceOfPath } from "@/lib/meta";

/** Where a contact link sits: an explicit data-contact-source, else header/footer, else the page type. */
function contactSourceOf(link: Element): string | undefined {
  const tagged = link.closest<HTMLElement>("[data-contact-source]")?.dataset.contactSource;
  if (tagged) return tagged;
  if (link.closest("header")) return "header";
  if (link.closest("footer")) return "footer";
  return contactSourceOfPath(window.location.pathname);
}

/**
 * One delegated listener: any click on a tel:, mailto:, wa.me or api.whatsapp.com link sends a lead
 * (Meta Contact + GA4 generate_lead). Only <a href> links count — the contact form's <button>s send
 * their own event, so nothing is counted twice.
 */
function ContactClicks() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      const method = link ? contactMethodOf(link.getAttribute("href") ?? "") : null;
      if (link && method) contact(method, contactSourceOf(link));
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}

/**
 * Meta (Facebook) Pixel for the storefront — mounted once in the (shop) layout, so the admin is never
 * tracked. Base code via next/script `afterInteractive` (init + first PageView), <noscript> fallback,
 * and Contact on WhatsApp/phone/e-mail clicks. Page views on client navigations come from <PageViewTracker>;
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
