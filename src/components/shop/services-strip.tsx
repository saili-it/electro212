import type { ReactNode } from "react";
import { BulbIcon, HeadsetIcon, ShieldCheckIcon, TruckIcon } from "./icons";

type Service = { icon: ReactNode; color: string; line1: string; line2: string };

type ServiceItem = Service & { chip: string };

const SERVICES: ServiceItem[] = [
  { icon: <TruckIcon className="h-6 w-6" />, color: "text-brand-red-600", chip: "bg-brand-red-50", line1: "Livraison rapide", line2: "partout au Maroc" },
  { icon: <HeadsetIcon className="h-6 w-6" />, color: "text-brand-navy", chip: "bg-brand-navy/5", line1: "Service client dédié", line2: "7J/7" },
  { icon: <BulbIcon className="h-6 w-6" />, color: "text-amber-500", chip: "bg-amber-50", line1: "Nos conseils,", line2: "achat et entretien" },
  { icon: <ShieldCheckIcon className="h-6 w-6" />, color: "text-brand-green-700", chip: "bg-brand-green-50", line1: "Produits certifiés,", line2: "garantie officielle" },
];

export function ServicesStrip() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-10" aria-label="Nos services">
      <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:gap-0">
          <p className="text-lg font-extrabold uppercase leading-tight tracking-tight text-brand-red-600 lg:flex lg:w-28 lg:shrink-0 lg:flex-col lg:justify-center lg:pr-4">
            Nos services
          </p>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:flex lg:flex-1">
            {SERVICES.map((service, i) => (
              <li
                key={service.line1}
                className={`flex items-center gap-3 lg:flex-1 lg:px-5 ${i > 0 ? "lg:border-l lg:border-slate-200" : ""}`}
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${service.chip} ${service.color}`}>
                  {service.icon}
                </span>
                <span className="text-sm leading-snug">
                  <span className="block font-semibold text-brand-navy">{service.line1}</span>
                  <span className="block text-slate-600">{service.line2}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
