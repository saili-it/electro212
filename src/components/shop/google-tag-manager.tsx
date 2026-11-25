import Script from "next/script";

/**
 * Google Tag Manager for the storefront (mounted once in the (shop) layout, so the admin is never tracked).
 * GA4 is configured inside the GTM container; the site only pushes events to `dataLayer`
 * (see src/lib/meta.ts). The id is checked against the GTM format before it goes into the inline script.
 */
export function GoogleTagManager({ id }: { id: string }) {
  if (!/^GTM-[A-Z0-9]+$/.test(id)) return null;
  return (
    <>
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${id}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
