import type { Metadata } from "next";
import { CartView } from "@/components/shop/cart/cart-view";

export const metadata: Metadata = {
  title: "Mon panier",
  // A personal, per-visitor page — nothing to index.
  robots: { index: false, follow: false },
  alternates: { canonical: "/panier" },
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Mon panier</h1>
      <CartView />
    </div>
  );
}
