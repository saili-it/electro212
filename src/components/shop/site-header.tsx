import Image from "next/image";
import Link from "next/link";
import { Award, BadgePercent, MessageCircle } from "lucide-react";
import { siteConfig, whatsappUrl } from "@/config/site";
import { getMenuCategories, type MenuCategory } from "@/data/storefront";
import { formatDh } from "@/lib/money";
import { CartShortcut } from "./cart/cart-shortcut";
import { CloseMenusOnNavigate } from "./close-menus-on-navigate";
import { DesktopCategoryMenu } from "./desktop-category-menu";
import { MobileNav } from "./mobile-nav";
import { PhoneIcon, SearchIcon, TruckIcon, WhatsAppIcon } from "./icons";

function SearchForm({ className = "", inputId }: { className?: string; inputId: string }) {
  return (
    <form action="/recherche" role="search" className={`relative ${className}`}>
      <label htmlFor={inputId} className="sr-only">
        Rechercher un produit
      </label>
      <input
        id={inputId}
        type="search"
        name="q"
        placeholder="Tapez ici un produit ou une catégorie de produit"
        className="h-12 w-full border-0 bg-white pl-4 pr-16 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 transition focus:outline-none focus:ring-4 focus:ring-white/40"
      />
      <button
        type="submit"
        aria-label="Rechercher"
        className="absolute inset-y-0 right-0 flex w-14 items-center justify-center bg-brand-red-50 text-brand-red-600 transition hover:bg-brand-red-600 hover:text-white"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
    </form>
  );
}

/** Round white icon button; on desktop its label sits underneath (Electroplanet's Compte / Favoris / Panier). */
function HeaderShortcut({
  href,
  icon,
  label,
  external = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white transition group-hover:bg-white group-hover:text-brand-red-600">
        {icon}
      </span>
      <span className="hidden text-xs font-medium text-white lg:block">{label}</span>
      <span className="sr-only lg:hidden">{label}</span>
    </>
  );
  const className = "group flex flex-col items-center gap-0.5";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : href.startsWith("tel:") ? (
    <a href={href} className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

const NAV_LINKS = [
  { href: "/promotions", label: "Promotions", Icon: BadgePercent },
  { href: "/#brands-title", label: "Nos marques", Icon: Award },
  { href: "/contact", label: "Contact", Icon: MessageCircle },
];

/**
 * Desktop nav: a slim white bar under the red band (sticky with it) —
 * "Catégories" (vertical mega menu) on the left, the main links, and the
 * free-delivery notice on the right.
 */
function DesktopNav({ categories }: { categories: MenuCategory[] }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky top-[72px] z-30 hidden border-b border-slate-200 bg-white shadow-[0_6px_16px_-14px_rgb(13_53_32/0.5)] lg:block"
    >
      <div className="relative mx-auto flex h-12 max-w-7xl items-stretch px-4">
        <DesktopCategoryMenu categories={categories} />

        <ul className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden px-4">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-semibold text-slate-700 transition hover:text-brand-red-600"
              >
                <link.Icon className="h-4 w-4 text-brand-red-600" strokeWidth={2} aria-hidden />
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <p className="flex shrink-0 items-center gap-2 text-sm text-slate-600">
          <TruckIcon className="h-5 w-5 text-brand-green-700" />
          Livraison gratuite dès {formatDh(siteConfig.freeDeliveryThresholdMad)}
        </p>
      </div>
    </nav>
  );
}

export async function SiteHeader() {
  const categories = await getMenuCategories();

  return (
    // `contents`: the bands below are sticky against the page, not against this wrapper.
    <header className="contents">
      <CloseMenusOnNavigate />

      {/* Announcement strip (scrolls away): the shop's standing promises. Phones show the first one only. */}
      <div className="bg-brand-dark text-white">
        <p className="mx-auto flex max-w-7xl items-center justify-center gap-x-6 px-4 py-1.5 font-display text-[13px] font-semibold uppercase tracking-[0.12em] sm:text-sm">
          <span>
            Livraison <span className="text-brand-green">gratuite</span> dès {formatDh(siteConfig.freeDeliveryThresholdMad)}
          </span>
          <span aria-hidden className="hidden text-white/30 sm:inline">/</span>
          <span className="hidden sm:inline">Paiement à la livraison</span>
          <span aria-hidden className="hidden text-white/30 lg:inline">/</span>
          <a href={`tel:${siteConfig.phone.e164}`} className="hidden transition hover:text-brand-green lg:inline">
            {siteConfig.phone.label} : {siteConfig.phone.display}
          </a>
        </p>
      </div>

      {/* Single red band, sticky. Fixed 72px on desktop so the nav bar can stick right under it. */}
      <div className="sticky top-0 z-40 bg-brand-red-600">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 lg:h-[72px] lg:gap-10 lg:py-0">
          <MobileNav categories={categories} />

          {/* The logo's "Electro" is brand red, so it sits on a white chip to stay visible on the red bar. */}
          <Link
            href="/"
            className="shrink-0 rounded-md bg-white px-2 py-1 shadow-sm transition hover:shadow-md"
            aria-label={`${siteConfig.name} — accueil`}
          >
            <Image src="/brand/logo.png" alt={siteConfig.name} width={628} height={444} priority className="h-9 w-auto lg:h-11" />
          </Link>

          <SearchForm inputId="site-search" className="hidden flex-1 md:block" />

          <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:gap-5">
            <HeaderShortcut href={`tel:${siteConfig.phone.e164}`} icon={<PhoneIcon className="h-5 w-5" />} label="Appeler" />
            <HeaderShortcut href={whatsappUrl()} external icon={<WhatsAppIcon className="h-5 w-5" />} label="WhatsApp" />
            <CartShortcut />
          </div>
        </div>
      </div>

      {/* Phones: the search row scrolls away; only the band above stays pinned. */}
      <div className="bg-brand-red-600 px-4 pb-3 md:hidden">
        <SearchForm inputId="site-search-mobile" />
      </div>

      <DesktopNav categories={categories} />
    </header>
  );
}
