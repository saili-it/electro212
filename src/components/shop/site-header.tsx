import Image from "next/image";
import Link from "next/link";
import { siteConfig, whatsappUrl } from "@/config/site";
import { getMenuCategories, type MenuCategory } from "@/data/storefront";
import { formatDh } from "@/lib/money";
import { CategoryIcon } from "./category-icon";
import { CartShortcut } from "./cart/cart-shortcut";
import { CloseMenusOnNavigate } from "./close-menus-on-navigate";
import { ChevronDownIcon, MenuIcon, PhoneIcon, SearchIcon, TruckIcon, WhatsAppIcon } from "./icons";

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
        placeholder="Rechercher un produit, une marque…"
        className="h-12 w-full rounded-full border border-transparent bg-slate-100 pl-5 pr-14 text-sm text-slate-900 placeholder:text-slate-500 transition focus:border-brand-red focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-red/10"
      />
      <button
        type="submit"
        aria-label="Rechercher"
        className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-brand-red-600 text-white transition hover:bg-brand-red-700"
      >
        <SearchIcon className="h-[18px] w-[18px]" />
      </button>
    </form>
  );
}

function HeaderShortcut({
  href,
  icon,
  label,
  detail,
  external = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="text-brand-navy transition group-hover:text-brand-red-600">{icon}</span>
      <span className="hidden text-left leading-tight xl:block">
        <span className="block text-sm font-semibold text-brand-navy">{label}</span>
        {detail && <span className="block text-xs text-slate-500">{detail}</span>}
      </span>
      <span className="text-[11px] font-medium text-slate-600 xl:hidden">{label}</span>
    </>
  );
  const className = "group flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 xl:flex-row xl:gap-2.5";
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

/** Category image when one is set, otherwise the line icon. */
function CategoryThumb({ category, className }: { category: MenuCategory; className: string }) {
  if (category.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- category image (WebP), host not known for next/image
      <img src={category.imageUrl} alt="" loading="lazy" className={`${className} shrink-0 rounded object-contain`} />
    );
  }
  return <CategoryIcon slug={category.slug} className={`${className} shrink-0`} />;
}

/** Full-width panel content for one main category. */
function CategoryPanel({ category }: { category: MenuCategory }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-4 gap-8 px-4 py-8">
      <div className="col-span-3">
        <p className="mb-4 text-lg font-bold text-brand-navy">{category.name}</p>
        <ul className="grid grid-cols-3 gap-x-8 gap-y-1">
          {category.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`/categories/${child.slug}`}
                className="block rounded-md py-1.5 text-sm text-slate-700 transition hover:text-brand-red-700 hover:underline"
              >
                {child.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href={`/categories/${category.slug}`}
        className="group/card flex flex-col items-center justify-center gap-3 rounded-2xl bg-surface p-6 text-center transition hover:bg-brand-red-50"
      >
        <CategoryThumb category={category} className="h-20 w-20 text-brand-navy transition group-hover/card:text-brand-red-600" />
        <span className="text-sm font-semibold text-brand-navy">Tout l&apos;univers {category.name}</span>
        <span className="text-xs font-medium text-brand-red-700">Voir tous les produits →</span>
      </Link>
    </div>
  );
}

const panelClass =
  "invisible absolute inset-x-0 top-full z-50 border-t border-slate-200 bg-white opacity-0 shadow-xl transition duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100";

function DesktopNav({ categories }: { categories: MenuCategory[] }) {
  return (
    <nav aria-label="Catégories" className="relative hidden border-t border-slate-200 lg:block">
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-0.5 gap-y-1 px-4">
        <li className="group py-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-brand-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-red-700"
          >
            <MenuIcon className="h-5 w-5" />
            Tous nos produits
          </button>
          {/* Mega menu: every main category with its sub-categories. */}
          <div className={panelClass}>
            <div className="mx-auto grid max-w-7xl grid-cols-6 gap-6 px-4 py-8">
              {categories.map((category) => (
                <div key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-navy hover:text-brand-red-700"
                  >
                    <CategoryThumb category={category} className="h-8 w-8" />
                    {category.name}
                  </Link>
                  <ul className="space-y-1.5">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link href={`/categories/${child.slug}`} className="text-sm text-slate-600 hover:text-brand-red-700 hover:underline">
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </li>

        <li className="group">
          <Link
            href="/promotions"
            className="relative flex h-14 items-center gap-1 px-2.5 text-[13px] font-bold text-brand-red-600 transition hover:text-brand-red-700 after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-t after:bg-brand-red-600 after:opacity-0 after:transition group-hover:after:opacity-100"
          >
            Promotions
          </Link>
        </li>

        {categories.map((category) => (
          <li key={category.id} className="group">
            <Link
              href={`/categories/${category.slug}`}
              className="relative flex h-14 items-center gap-1 px-2.5 text-[13px] font-semibold text-brand-navy transition hover:text-brand-red-700 group-focus-within:text-brand-red-700 after:absolute after:inset-x-2.5 after:bottom-0 after:h-[3px] after:rounded-t after:bg-brand-red-600 after:opacity-0 after:transition group-hover:after:opacity-100 group-focus-within:after:opacity-100"
            >
              {category.name}
              {category.children.length > 0 && <ChevronDownIcon className="h-3 w-3 opacity-60" />}
            </Link>
            {category.children.length > 0 && (
              <div className={panelClass}>
                <CategoryPanel category={category} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MobileMenu({ categories }: { categories: MenuCategory[] }) {
  return (
    <details className="group/menu lg:hidden">
      <summary
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg text-brand-navy hover:bg-slate-100"
        aria-label="Menu des catégories"
      >
        <MenuIcon />
      </summary>
      <div className="absolute inset-x-0 top-full z-50 max-h-[75vh] overflow-y-auto border-t border-slate-200 bg-white shadow-xl">
        <p className="bg-brand-red-600 px-5 py-3 text-sm font-semibold text-white">Tous nos produits</p>
        <ul className="divide-y divide-slate-100">
          <li>
            <Link href="/promotions" className="block px-5 py-3.5 font-bold text-brand-red-600">
              🔥 Promotions
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <details className="group/cat">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 font-semibold text-brand-navy">
                  <CategoryThumb category={category} className="h-8 w-8" />
                  <span className="flex-1">{category.name}</span>
                  <ChevronDownIcon className="h-4 w-4 transition group-open/cat:rotate-180" />
                </summary>
                <ul className="bg-surface pb-2">
                  <li>
                    <Link href={`/categories/${category.slug}`} className="block px-14 py-2 text-sm font-semibold text-brand-red-700">
                      Voir tout
                    </Link>
                  </li>
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <Link href={`/categories/${child.slug}`} className="block px-14 py-2 text-sm text-slate-700">
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

export async function SiteHeader() {
  const categories = await getMenuCategories();

  return (
    <header className="relative z-40 bg-white shadow-[0_4px_20px_-12px_rgb(13_6_37/0.25)]">
      <CloseMenusOnNavigate />
      <div className="bg-brand-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-6 px-4 py-2 text-xs sm:justify-between">
          <p className="flex items-center gap-2">
            <TruckIcon className="h-4 w-4 text-brand-green" />
            Livraison gratuite dès {formatDh(siteConfig.freeDeliveryThresholdMad)} d&apos;achat
          </p>
          <a href={`tel:${siteConfig.phone.e164}`} className="hidden items-center gap-2 hover:underline sm:flex">
            <PhoneIcon className="h-4 w-4 text-brand-green" />
            Conseil 24/7 : {siteConfig.phone.display}
          </a>
        </div>
      </div>

      <div className="relative">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-8">
          <MobileMenu categories={categories} />

          <Link href="/" className="shrink-0" aria-label={`${siteConfig.name} — accueil`}>
            <Image src="/brand/logo.png" alt={siteConfig.name} width={628} height={444} priority className="h-11 w-auto lg:h-14" />
          </Link>

          <SearchForm inputId="site-search" className="hidden flex-1 md:block" />

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <HeaderShortcut
              href={`tel:${siteConfig.phone.e164}`}
              icon={<PhoneIcon className="h-6 w-6" />}
              label="Appelez-nous"
              detail={siteConfig.phone.display}
            />
            <HeaderShortcut
              href={whatsappUrl()}
              external
              icon={<WhatsAppIcon className="h-6 w-6" />}
              label="WhatsApp"
              detail="Conseil produit"
            />
            <CartShortcut />
          </div>
        </div>

        <div className="px-4 pb-3 md:hidden">
          <SearchForm inputId="site-search-mobile" />
        </div>
      </div>

      <DesktopNav categories={categories} />
    </header>
  );
}
