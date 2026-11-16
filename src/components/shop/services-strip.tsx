import type { ReactNode } from "react";
import { BulbIcon, HeadsetIcon, ShieldCheckIcon, TruckIcon } from "./icons";

type Service = { icon: ReactNode; color: string; line1: string; line2: string };

type ServiceItem = Service & { chip: string };

const SERVICES: ServiceItem[] = [
  { icon: <TruckIcon className="h-6 w-6" />, color: "text-brand-red-600", chip: "bg-brand-red-50", line1: "Livraison rapide", line2: "partout au Maroc" },
  { icon: <HeadsetIcon className="h-6 w-6" />, color: "text-brand-green-700", chip: "bg-brand-green-50", line1: "Service client dédié", line2: "7J/7" },
  { icon: <BulbIcon className="h-6 w-6" />, color: "text-brand-red-600", chip: "bg-brand-red-50", line1: "Nos conseils,", line2: "achat et entretien" },
  { icon: <ShieldCheckIcon className="h-6 w-6" />, color: "text-brand-green-700", chip: "bg-brand-green-50", line1: "Produits certifiés,", line2: "garantie officielle" },
];

export function ServicesStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-8" aria-label="Nos services">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SERVICES.map((service) => (
          <li key={service.line1} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-3 sm:px-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${service.chip} ${service.color}`}>
              {service.icon}
            </span>
            <span className="text-[13px] leading-snug sm:text-sm">
              <span className="block font-semibold text-brand-dark">{service.line1}</span>
              <span className="block text-slate-500">{service.line2}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
