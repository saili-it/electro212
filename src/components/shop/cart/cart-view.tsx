"use client";

import Link from "next/link";
import { siteConfig, whatsappUrl } from "@/config/site";
import { formatDh, formatMinorUnits, toMajorUnits } from "@/lib/money";
import { ImagePlaceholderIcon, TruckIcon, WhatsAppIcon } from "../icons";
import { useCart, type CartItem } from "./cart-provider";

function buildOrderMessage(items: CartItem[], totalMinorUnits: number): string {
  const lines = items.map((i) => `• ${i.qty} × ${i.name} — ${formatMinorUnits(i.priceMinorUnits * i.qty)}`);
  return `Bonjour ${siteConfig.name}, je souhaite commander :\n${lines.join("\n")}\n\nTotal : ${formatMinorUnits(totalMinorUnits)}`;
}

function QtyStepper({ item }: { item: CartItem }) {
  const { setQty } = useCart();
  return (
    <div className="flex h-10 items-center rounded-full border border-slate-200 bg-white px-1">
      <button
        type="button"
        onClick={() => setQty(item.id, item.qty - 1)}
        aria-label="Diminuer la quantité"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-brand-navy transition hover:bg-slate-100"
      >
        −
      </button>
      <span className="w-7 text-center text-sm font-bold text-brand-navy">{item.qty}</span>
      <button
        type="button"
        onClick={() => setQty(item.id, item.qty + 1)}
        aria-label="Augmenter la quantité"
        className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-brand-navy transition hover:bg-slate-100"
      >
        +
      </button>
    </div>
  );
}

export function CartView() {
  const { items, hydrated, count, totalMinorUnits, remove, clear } = useCart();

  if (!hydrated) {
    return <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200/70" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-2xl bg-white p-12 text-center shadow-soft ring-1 ring-slate-200/70">
        <ImagePlaceholderIcon className="h-16 w-16 text-slate-200" />
        <p className="mt-4 text-lg font-semibold text-brand-navy">Votre panier est vide</p>
        <p className="mt-1 text-sm text-slate-500">Parcourez nos univers et ajoutez vos produits préférés.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-full bg-brand-red-600 px-6 py-3 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700"
        >
          Continuer mes achats
        </Link>
      </div>
    );
  }

  const freeDelivery = toMajorUnits(totalMinorUnits) >= siteConfig.freeDeliveryThresholdMad;
  const remainingForFree = siteConfig.freeDeliveryThresholdMad - toMajorUnits(totalMinorUnits);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200/70"
            >
              <Link
                href={`/produits/${item.slug}`}
                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface/60"
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- storage host isn't configured for next/image yet
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-2" />
                ) : (
                  <ImagePlaceholderIcon className="h-8 w-8 text-slate-300" />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/produits/${item.slug}`} className="line-clamp-2 text-sm font-semibold text-brand-navy hover:text-brand-red-700">
                  {item.name}
                </Link>
                <p className="mt-0.5 text-xs text-slate-400">{formatMinorUnits(item.priceMinorUnits)} / unité</p>
                <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                  <QtyStepper item={item} />
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-brand-red-700 hover:underline"
                  >
                    Retirer
                  </button>
                </div>
              </div>

              <p className="shrink-0 self-center text-right text-sm font-bold text-brand-navy">
                {formatMinorUnits(item.priceMinorUnits * item.qty)}
              </p>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={clear}
          className="mt-4 text-sm font-medium text-slate-400 underline-offset-2 hover:text-brand-red-700 hover:underline"
        >
          Vider le panier
        </button>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70">
          <h2 className="text-lg font-extrabold text-brand-navy">Récapitulatif</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">
                Sous-total ({count} article{count > 1 ? "s" : ""})
              </dt>
              <dd className="font-semibold text-brand-navy">{formatMinorUnits(totalMinorUnits)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Livraison</dt>
              <dd className="font-semibold text-brand-green-700">{freeDelivery ? "Offerte" : "À confirmer"}</dd>
            </div>
          </dl>

          {!freeDelivery && remainingForFree > 0 && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface/80 px-3 py-2.5 text-xs text-slate-600">
              <TruckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-700" />
              Plus que {formatDh(Math.ceil(remainingForFree))} pour la livraison offerte.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-base font-bold text-brand-navy">Total</span>
            <span className="text-xl font-extrabold text-brand-navy">{formatMinorUnits(totalMinorUnits)}</span>
          </div>

          <Link
            href="/commande"
            className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-full bg-brand-red-600 px-6 py-4 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700"
          >
            Passer la commande
          </Link>
          <a
            href={whatsappUrl(buildOrderMessage(items, totalMinorUnits))}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-full border border-brand-green/40 px-6 py-3.5 text-sm font-semibold text-brand-green-700 transition hover:bg-brand-green-50"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Commander sur WhatsApp
          </a>
          <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
            Un conseiller confirme votre commande, la disponibilité et le règlement (paiement à la livraison ou en magasin).
          </p>
          <Link
            href="/"
            className="mt-3 block text-center text-sm font-medium text-brand-red-700 hover:underline"
          >
            Continuer mes achats
          </Link>
        </div>
      </aside>
    </div>
  );
}
