import type { Metadata } from "next";
import Link from "next/link";
import { getActivePromotions } from "@/data/promotions";
import { siteConfig } from "@/config/site";
import { formatShopDeadline } from "@/lib/datetime";
import { Reveal } from "@/components/shop/reveal";
import { ImagePlaceholderIcon } from "@/components/shop/icons";

export const metadata: Metadata = {
  title: "Promotions",
  description: `Toutes les promotions et offres spéciales ${siteConfig.name} : électroménager, TV et plus au meilleur prix.`,
  alternates: { canonical: "/promotions" },
};

export default async function PromotionsIndexPage() {
  const promotions = await getActivePromotions();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Promotions</h1>
        <p className="mt-2 text-sm text-slate-600">Nos offres et événements du moment.</p>
      </header>

      {promotions.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-soft">
          <p className="font-semibold text-brand-navy">Aucune promotion en cours</p>
          <p className="mt-1 text-sm text-slate-500">Revenez bientôt pour découvrir nos prochaines offres.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-full bg-brand-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700"
          >
            Parcourir la boutique
          </Link>
        </div>
      ) : (
        <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((promo) => (
            <Link
              key={promo.slug}
              href={`/promotions/${promo.slug}`}
              className="group overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70 transition hover:shadow-pop"
            >
              <div className="relative aspect-[16/7] w-full overflow-hidden bg-surface/60">
                {promo.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- storage host isn't configured for next/image
                  <img
                    src={promo.heroImageUrl}
                    alt={promo.title}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImagePlaceholderIcon className="h-12 w-12 text-slate-200" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-lg font-extrabold text-brand-navy group-hover:text-brand-red-700">{promo.title}</h2>
                {promo.subtitle && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{promo.subtitle}</p>}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-500">
                    {promo.productCount} produit{promo.productCount > 1 ? "s" : ""}
                  </span>
                  {promo.endsAtMs && (
                    <span className="font-semibold text-brand-red-600">Jusqu&apos;au {formatShopDeadline(new Date(promo.endsAtMs))}</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </Reveal>
      )}
    </div>
  );
}
