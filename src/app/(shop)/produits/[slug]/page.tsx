import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductDetail } from "@/data/catalog";
import { siteConfig, whatsappUrl } from "@/config/site";
import { formatMinorUnits, toMajorUnits } from "@/lib/money";
import { Price } from "@/components/shop/product-card";
import { ProductCard } from "@/components/shop/product-card";
import { ProductCarousel } from "@/components/shop/product-carousel";
import { ProductGallery } from "@/components/shop/product-gallery";
import { AddToCart } from "@/components/shop/cart/add-to-cart";
import { HeadsetIcon, ShieldCheckIcon, TruckIcon, WhatsAppIcon } from "@/components/shop/icons";

export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) return {};

  const description =
    product.seoDescription ??
    product.shortDescription ??
    `${product.name}${product.brand ? ` ${product.brand.name}` : ""} — ${formatMinorUnits(product.priceMinorUnits)} chez ${siteConfig.name}.`;
  const image = product.images[0]?.url;

  return {
    title: product.seoTitle ?? product.name,
    description,
    alternates: { canonical: `/produits/${slug}` },
    openGraph: {
      type: "website",
      url: `/produits/${slug}`,
      title: product.seoTitle ?? product.name,
      description,
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
  };
}

function Breadcrumb({ items }: { items: { href?: string; name: string }[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="mb-4 text-sm text-slate-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-red-700">
                {item.name}
              </Link>
            ) : (
              <span className="line-clamp-1 font-medium text-slate-700">{item.name}</span>
            )}
            {i < items.length - 1 && <span aria-hidden className="text-slate-300">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ProductJsonLd({ product }: { product: NonNullable<Awaited<ReturnType<typeof getProductDetail>>> }) {
  const url = new URL(`/produits/${product.slug}`, siteConfig.url).toString();
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      sku: product.sku,
      ...(product.description || product.shortDescription
        ? { description: product.description ?? product.shortDescription }
        : {}),
      ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
      ...(product.images.length > 0 ? { image: product.images.map((i) => i.url) } : {}),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: product.currency,
        price: toMajorUnits(product.priceMinorUnits).toFixed(2),
        availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: siteConfig.name },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { name: "Accueil", url: siteConfig.url },
        ...product.breadcrumb.map((b) => ({ name: b.name, url: new URL(`/categories/${b.slug}`, siteConfig.url).toString() })),
        { name: product.name, url },
      ].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // Built from our own catalogue data only.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function Reassurance() {
  const items = [
    { icon: <TruckIcon className="h-5 w-5" />, text: "Livraison rapide partout au Maroc" },
    { icon: <ShieldCheckIcon className="h-5 w-5" />, text: "Produits certifiés, garantie officielle" },
    { icon: <HeadsetIcon className="h-5 w-5" />, text: "Service client dédié 7J/7" },
  ];
  return (
    <ul className="mt-6 space-y-2.5 border-t border-slate-200 pt-6">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-3 text-sm text-slate-600">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green-700">
            {item.icon}
          </span>
          {item.text}
        </li>
      ))}
    </ul>
  );
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();

  const hasDiscount =
    product.compareAtPriceMinorUnits !== null && product.compareAtPriceMinorUnits > product.priceMinorUnits;
  const discount = hasDiscount
    ? Math.round(((product.compareAtPriceMinorUnits! - product.priceMinorUnits) / product.compareAtPriceMinorUnits!) * 100)
    : null;
  const savings = hasDiscount ? product.compareAtPriceMinorUnits! - product.priceMinorUnits : 0;
  const freeDelivery = toMajorUnits(product.priceMinorUnits) >= siteConfig.freeDeliveryThresholdMad;

  const productUrl = new URL(`/produits/${product.slug}`, siteConfig.url).toString();
  const waMessage = `Bonjour ${siteConfig.name}, je suis intéressé(e) par ce produit :\n• ${product.name} (réf. ${product.sku})\n${formatMinorUnits(product.priceMinorUnits)}\n${productUrl}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <ProductJsonLd product={product} />

      <Breadcrumb
        items={[
          { href: "/", name: "Accueil" },
          ...product.breadcrumb.map((b) => ({ href: `/categories/${b.slug}`, name: b.name })),
          { name: product.name },
        ]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          {product.brand && (
            <Link
              href={`/marques/${product.brand.slug}`}
              className="text-sm font-bold uppercase tracking-wide text-brand-navy hover:text-brand-red-700"
            >
              {product.brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight text-brand-navy sm:text-3xl">
            {product.name}
          </h1>
          <p className="mt-2 text-xs text-slate-400">Réf. {product.sku}</p>

          {product.shortDescription && (
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{product.shortDescription}</p>
          )}

          <div className="mt-6 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              {hasDiscount && (
                <span className="text-sm text-slate-400 line-through">{formatMinorUnits(product.compareAtPriceMinorUnits!)}</span>
              )}
              {discount !== null && (
                <span className="rounded-full bg-brand-red-600 px-2.5 py-1 text-xs font-bold text-white">−{discount}%</span>
              )}
            </div>
            <Price
              minorUnits={product.priceMinorUnits}
              className={`mt-1 text-2xl ${hasDiscount ? "text-brand-red-600" : "text-brand-navy"}`}
            />
            {savings > 0 && (
              <p className="mt-1 text-sm font-semibold text-brand-green-700">
                Vous économisez {formatMinorUnits(savings)}
              </p>
            )}
            <p className="mt-1 text-xs text-slate-400">Prix TTC. Paiement à la livraison ou en magasin.</p>

            <div className="mt-4 flex flex-col gap-2 text-sm">
              <p className={`flex items-center gap-2 font-semibold ${product.inStock ? "text-brand-green-700" : "text-slate-400"}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${product.inStock ? "bg-brand-green" : "bg-slate-300"}`} aria-hidden />
                {product.inStock ? (product.lowStock ? "Plus que quelques pièces en stock" : "En stock") : "Rupture de stock"}
              </p>
              {freeDelivery && (
                <p className="flex items-center gap-2 text-slate-600">
                  <TruckIcon className="h-4 w-4 text-brand-green-700" />
                  Livraison offerte sur ce produit
                </p>
              )}
            </div>

            <AddToCart
              item={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                priceMinorUnits: product.priceMinorUnits,
                imageUrl: product.images[0]?.url ?? null,
              }}
              inStock={product.inStock}
              max={product.availableStock}
            />

            <a
              href={whatsappUrl(waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-brand-green/40 bg-brand-green/5 text-sm font-semibold text-brand-green-700 transition hover:bg-brand-green/10"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Commander sur WhatsApp
            </a>
          </div>

          <Reassurance />
        </div>
      </div>

      {(product.specs.length > 0 || product.description) && (
        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {product.description && (
            <section aria-labelledby="desc-title">
              <h2 id="desc-title" className="text-xl font-extrabold tracking-tight text-brand-navy">
                Description
              </h2>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{product.description}</div>
            </section>
          )}

          {product.specs.length > 0 && (
            <section aria-labelledby="specs-title">
              <h2 id="specs-title" className="text-xl font-extrabold tracking-tight text-brand-navy">
                Caractéristiques
              </h2>
              <dl className="mt-4 overflow-hidden rounded-2xl ring-1 ring-slate-200/70">
                {product.specs.map((spec, i) => (
                  <div key={spec.label} className={`flex gap-4 px-4 py-3 text-sm ${i % 2 === 0 ? "bg-white" : "bg-surface/60"}`}>
                    <dt className="w-2/5 shrink-0 font-medium text-slate-500">{spec.label}</dt>
                    <dd className="font-semibold text-brand-navy">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {product.related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-6 flex items-center gap-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            <span className="h-7 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-brand-red to-brand-red-700" aria-hidden />
            Dans la même catégorie
          </h2>
          <ProductCarousel label="Produits similaires">
            {product.related.map((related) => (
              <div key={related.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-[23.5%] xl:w-[19%]">
                <ProductCard product={related} className="h-full" />
              </div>
            ))}
          </ProductCarousel>
        </section>
      )}
    </div>
  );
}
