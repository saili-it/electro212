import Image from "next/image";
import Link from "next/link";
import { mailtoUrl, siteConfig, whatsappUrl } from "@/config/site";
import { getMenuCategories, getShopBrands } from "@/data/storefront";
import { formatDh } from "@/lib/money";
import { MailIcon, MapPinIcon, PhoneIcon, TruckIcon, WhatsAppIcon } from "./icons";

function ShieldIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 3 4.5 6v5.25c0 4.5 3.2 8.4 7.5 9.75 4.3-1.35 7.5-5.25 7.5-9.75V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export async function SiteFooter() {
  const [categories, brands] = await Promise.all([getMenuCategories(), getShopBrands()]);
  const brandNames = brands.slice(0, 3).map((b) => b.name).join(", ");

  const reassurance = [
    {
      icon: <TruckIcon className="h-7 w-7" />,
      title: "Livraison gratuite",
      text: `Dès ${formatDh(siteConfig.freeDeliveryThresholdMad)} d'achat`,
    },
    { icon: <PhoneIcon className="h-7 w-7" />, title: "Conseil 24/7", text: siteConfig.phone.display, href: `tel:${siteConfig.phone.e164}` },
    { icon: <WhatsAppIcon className="h-7 w-7" />, title: "Conseil sur WhatsApp", text: "Une question sur un produit ?", href: whatsappUrl(), external: true },
    ...(brandNames ? [{ icon: <ShieldIcon />, title: "Grandes marques", text: `${brandNames}…` }] : []),
  ];

  return (
    <footer className="mt-16">
      <div className="border-y border-slate-200 bg-white">
        <ul className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {reassurance.map((item) => {
            const body = (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-red-50 text-brand-red-600">
                  {item.icon}
                </span>
                <span>
                  <span className="block text-sm font-bold text-brand-navy">{item.title}</span>
                  <span className="block text-sm text-slate-500">{item.text}</span>
                </span>
              </>
            );
            return (
              <li key={item.title}>
                {item.href ? (
                  <a
                    href={item.href}
                    {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex items-center gap-4 rounded-xl transition hover:opacity-80"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="flex items-center gap-4">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-brand-navy text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/brand/logo-on-dark.png" alt={siteConfig.name} width={628} height={444} className="h-16 w-auto" />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">{siteConfig.description}</p>
          </div>

          <nav aria-label="Nos rayons" className="lg:col-span-2">
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Nos rayons</p>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link href={`/categories/${category.slug}`} className="transition hover:text-white hover:underline">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Contact</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a href={`tel:${siteConfig.phone.e164}`} className="flex items-center gap-2.5 transition hover:text-white">
                  <PhoneIcon className="h-5 w-5 text-brand-green" />
                  {siteConfig.phone.display}
                </a>
              </li>
              <li>
                <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition hover:text-white">
                  <WhatsAppIcon className="h-5 w-5 text-brand-green" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a href={mailtoUrl()} className="flex items-center gap-2.5 transition hover:text-white">
                  <MailIcon className="h-5 w-5 text-brand-green" />
                  {siteConfig.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5 text-slate-400">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />
                <span>
                  {siteConfig.address.line1}
                  <br />
                  {siteConfig.address.postalCode} {siteConfig.address.city}
                </span>
              </li>
              <li>
                <Link href="/contact" className="font-semibold text-white transition hover:underline">
                  Nous contacter →
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © 2026 {siteConfig.name} — {siteConfig.address.company}. Tous droits réservés.
            </p>
            <nav aria-label="Liens légaux" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href="/contact" className="transition hover:text-white">Contact</Link>
              <Link href="/mentions-legales" className="transition hover:text-white">Mentions légales</Link>
              <Link href="/cgv" className="transition hover:text-white">CGV</Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
