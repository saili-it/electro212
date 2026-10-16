import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/shop/checkout/checkout-form";

export const metadata: Metadata = {
  title: "Commander",
  // A personal, per-visitor flow — nothing to index.
  robots: { index: false, follow: false },
  alternates: { canonical: "/commande" },
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav aria-label="Fil d'Ariane" className="mb-2 text-sm text-slate-500">
        <Link href="/panier" className="hover:text-brand-red-700">
          Panier
        </Link>
        <span aria-hidden className="px-1.5 text-slate-300">
          /
        </span>
        <span className="font-medium text-slate-700">Commander</span>
      </nav>
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Finaliser ma commande</h1>
      <CheckoutForm />
    </div>
  );
}
