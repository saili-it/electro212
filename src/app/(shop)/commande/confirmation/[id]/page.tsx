import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderConfirmation } from "@/data/orders";
import { siteConfig, whatsappUrl } from "@/config/site";
import { formatMinorUnits } from "@/lib/money";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import { CheckCircleIcon, WhatsAppIcon } from "@/components/shop/icons";

export const instant = false;

export const metadata: Metadata = {
  title: "Commande confirmée",
  robots: { index: false, follow: false },
};

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderConfirmation(id);
  if (!order) notFound();

  const isPickup = order.deliveryCity === "Retrait en magasin";
  const waMessage = `Bonjour ${siteConfig.name}, je confirme ma commande ${order.reference} (total ${formatMinorUnits(order.totalMinorUnits)}).`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-slate-200/70">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-brand-green" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Merci, {order.contactName.split(" ")[0]} !</h1>
        <p className="mt-2 text-sm text-slate-600">
          Votre commande <span className="font-semibold text-brand-navy">{order.reference}</span> a bien été enregistrée.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Statut : <span className="font-medium text-brand-navy">{ORDER_STATUS_LABELS[order.status]}</span> — un conseiller
          vous rappelle pour confirmer la disponibilité, les frais de livraison et le règlement.
        </p>

        <a
          href={whatsappUrl(waMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center gap-2.5 rounded-full bg-brand-green px-6 py-3.5 text-sm font-semibold text-white shadow-pop transition hover:brightness-95"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Confirmer sur WhatsApp
        </a>
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70">
        <h2 className="text-lg font-extrabold text-brand-navy">Récapitulatif</h2>
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2.5">
              <span className="min-w-0 text-slate-600">
                <span className="font-medium text-brand-navy">{item.quantity}×</span> {item.name}
                <span className="block text-xs text-slate-400">{formatMinorUnits(item.unitPriceMinorUnits)} / unité</span>
              </span>
              <span className="shrink-0 font-semibold text-brand-navy">{formatMinorUnits(item.lineTotalMinorUnits)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Sous-total</dt>
            <dd className="font-semibold text-brand-navy">{formatMinorUnits(order.subtotalMinorUnits)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">Livraison</dt>
            <dd className="font-semibold text-brand-green-700">À confirmer</dd>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-2">
            <dt className="text-base font-bold text-brand-navy">Total</dt>
            <dd className="text-lg font-extrabold text-brand-navy">{formatMinorUnits(order.totalMinorUnits)}</dd>
          </div>
        </dl>

        <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 text-sm sm:grid-cols-2">
          <div>
            <p className="font-semibold text-brand-navy">{isPickup ? "Retrait" : "Livraison"}</p>
            <p className="mt-1 text-slate-600">{isPickup ? order.deliveryAddressLine : `${order.deliveryAddressLine}, ${order.deliveryCity}`}</p>
          </div>
          <div>
            <p className="font-semibold text-brand-navy">Paiement</p>
            <p className="mt-1 text-slate-600">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm font-medium text-brand-red-700 hover:underline">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
