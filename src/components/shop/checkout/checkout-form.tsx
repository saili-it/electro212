"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { siteConfig, whatsappUrl } from "@/config/site";
import { formatMinorUnits } from "@/lib/money";
import { placeOrderAction, type CheckoutState } from "@/app/(shop)/commande/actions";
import { ImagePlaceholderIcon, ShieldCheckIcon, TruckIcon, WhatsAppIcon } from "../icons";
import { useCart } from "../cart/cart-provider";

type Mode = "livraison-cod" | "livraison-virement" | "retrait-magasin";

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-soft transition focus:border-brand-red focus:outline-none focus:ring-4 focus:ring-brand-red/10";
const labelClass = "text-sm font-medium text-brand-navy";

const MODES: { value: Mode; title: string; hint: string }[] = [
  { value: "livraison-cod", title: "Livraison — paiement à la livraison", hint: "Vous réglez en espèces à la réception." },
  { value: "livraison-virement", title: "Livraison — virement bancaire", hint: "Un conseiller vous transmet les coordonnées bancaires." },
  { value: "retrait-magasin", title: "Retrait en magasin", hint: "Vous retirez et réglez votre commande en magasin." },
];

function Field({
  label,
  htmlFor,
  error,
  children,
  optional,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label} {optional && <span className="font-normal text-slate-400">(facultatif)</span>}
      </label>
      {children}
      {error && <p className="text-xs font-medium text-brand-red-700">{error}</p>}
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, hydrated, count, totalMinorUnits, clear } = useCart();
  const [state, dispatch, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, null);
  const [mode, setMode] = useState<Mode>("livraison-cod");
  const idemRef = useRef<string | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (state?.ok && !navigatedRef.current) {
      navigatedRef.current = true;
      clear();
      router.push(`/commande/confirmation/${state.orderId}`);
    }
  }, [state, clear, router]);

  const failed = state && !state.ok ? state : null;
  const fieldError = (name: string) => failed?.fieldErrors?.[name];
  const isPickup = mode === "retrait-magasin";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!idemRef.current) idemRef.current = crypto.randomUUID();
    const formData = new FormData(event.currentTarget);
    formData.set("mode", mode);
    formData.set("idempotencyKey", idemRef.current);
    formData.set("items", JSON.stringify(items.map((item) => ({ productId: item.id, qty: item.qty }))));
    startTransition(() => dispatch(formData));
  }

  if (!hydrated) {
    return <div className="mt-6 h-96 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200/70" aria-hidden />;
  }

  if (items.length === 0 && !state?.ok) {
    return (
      <div className="mt-6 flex flex-col items-center rounded-2xl bg-white p-12 text-center shadow-soft ring-1 ring-slate-200/70">
        <ImagePlaceholderIcon className="h-16 w-16 text-slate-200" />
        <p className="mt-4 text-lg font-semibold text-brand-navy">Votre panier est vide</p>
        <p className="mt-1 text-sm text-slate-500">Ajoutez des produits avant de passer commande.</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-full bg-brand-red-600 px-6 py-3 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700"
        >
          Continuer mes achats
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 grid gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-6 lg:col-span-2">
        {failed && (
          <div role="alert" className="rounded-xl border border-brand-red/30 bg-brand-red-50 px-4 py-3 text-sm text-brand-red-700">
            <p className="font-semibold">{failed.error}</p>
            {failed.issues && failed.issues.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {failed.issues.map((issue, i) => (
                  <li key={i}>
                    <span className="font-medium">{issue.name}</span> {issue.reason}
                  </li>
                ))}
              </ul>
            )}
            {failed.issues && failed.issues.length > 0 && (
              <Link href="/panier" className="mt-2 inline-block font-semibold underline underline-offset-2">
                Revenir au panier
              </Link>
            )}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70">
          <h2 className="text-lg font-extrabold text-brand-navy">Vos coordonnées</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet" htmlFor="contactName" error={fieldError("contactName")}>
              <input id="contactName" name="contactName" type="text" autoComplete="name" required placeholder="Votre nom" className={inputClass} />
            </Field>
            <Field label="Téléphone" htmlFor="contactPhone" error={fieldError("contactPhone")}>
              <input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" required placeholder="06 00 00 00 00" className={inputClass} />
            </Field>
            <Field label="E-mail" htmlFor="contactEmail" error={fieldError("contactEmail")} optional>
              <input id="contactEmail" name="contactEmail" type="email" autoComplete="email" placeholder="vous@exemple.com" className={`${inputClass} sm:col-span-2`} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70">
          <h2 className="text-lg font-extrabold text-brand-navy">Réception &amp; paiement</h2>
          <div className="mt-4 flex flex-col gap-2.5">
            {MODES.map((option) => {
              const active = mode === option.value;
              return (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                    active ? "border-brand-red bg-brand-red-50/60 ring-2 ring-brand-red/15" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={option.value}
                    checked={active}
                    onChange={() => setMode(option.value)}
                    className="mt-1 h-4 w-4 accent-brand-red"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-brand-navy">{option.title}</span>
                    <span className="text-xs text-slate-500">{option.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {!isPickup && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Ville" htmlFor="deliveryCity" error={fieldError("deliveryCity")}>
                <input id="deliveryCity" name="deliveryCity" type="text" autoComplete="address-level2" placeholder="Casablanca" className={inputClass} />
              </Field>
              <Field label="Adresse" htmlFor="deliveryAddressLine" error={fieldError("deliveryAddressLine")}>
                <input id="deliveryAddressLine" name="deliveryAddressLine" type="text" autoComplete="street-address" placeholder="Rue, numéro, quartier" className={inputClass} />
              </Field>
            </div>
          )}

          <div className="mt-4">
            <Field label="Notes pour la livraison" htmlFor="deliveryNotes" error={fieldError("deliveryNotes")} optional>
              <textarea
                id="deliveryNotes"
                name="deliveryNotes"
                rows={3}
                placeholder="Point de repère, horaires de disponibilité…"
                className={`${inputClass} h-auto py-3`}
              />
            </Field>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70">
          <h2 className="text-lg font-extrabold text-brand-navy">Votre commande</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-slate-600">
                  <span className="font-medium text-brand-navy">{item.qty}×</span> {item.name}
                </span>
                <span className="shrink-0 font-semibold text-brand-navy">{formatMinorUnits(item.priceMinorUnits * item.qty)}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">
                Sous-total ({count} article{count > 1 ? "s" : ""})
              </dt>
              <dd className="font-semibold text-brand-navy">{formatMinorUnits(totalMinorUnits)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-500">Livraison</dt>
              <dd className="font-semibold text-brand-green-700">À confirmer</dd>
            </div>
          </dl>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-base font-bold text-brand-navy">Total</span>
            <span className="text-xl font-extrabold text-brand-navy">{formatMinorUnits(totalMinorUnits)}</span>
          </div>

          <button
            type="submit"
            disabled={pending || items.length === 0}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-red-600 px-6 py-4 text-sm font-semibold text-white shadow-pop transition hover:bg-brand-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
            {pending ? "Envoi en cours…" : "Confirmer la commande"}
          </button>

          <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <ShieldCheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-700" />
            Un conseiller vous rappelle pour confirmer la disponibilité, les frais de livraison et le règlement.
          </p>

          <a
            href={whatsappUrl(`Bonjour ${siteConfig.name}, j'ai une question sur ma commande.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-brand-green-700 transition hover:bg-brand-green-50"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Une question ? Écrivez-nous
          </a>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
          <TruckIcon className="h-4 w-4" /> Livraison partout au Maroc
        </p>
      </aside>
    </form>
  );
}
