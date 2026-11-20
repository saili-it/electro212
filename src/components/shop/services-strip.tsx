import type { ReactNode } from "react";
import { BulbIcon, HeadsetIcon, ShieldCheckIcon, TruckIcon } from "./icons";

type Service = { icon: ReactNode; line1: string; line2: string };

const SERVICES: Service[] = [
  { icon: <TruckIcon className="h-6 w-6" />, line1: "Livraison rapide", line2: "partout au Maroc" },
  { icon: <HeadsetIcon className="h-6 w-6" />, line1: "Service client", line2: "7 jours sur 7" },
  { icon: <BulbIcon className="h-6 w-6" />, line1: "Conseils d'experts", line2: "achat et entretien" },
  { icon: <ShieldCheckIcon className="h-6 w-6" />, line1: "Garantie officielle", line2: "produits certifiés" },
];

/** Full-width deep-green band of shop promises, right under the hero. */
export function ServicesStrip() {
  return (
    <section className="mt-6 bg-brand-dark text-white sm:mt-8" aria-label="Nos services">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service, index) => (
          <li
            key={service.line1}
            className={`flex items-center gap-2.5 px-3 py-3.5 sm:gap-3 sm:px-4 sm:py-5 ${index % 2 === 1 ? "border-l border-white/10" : ""} ${index >= 2 ? "border-t border-white/10 lg:border-t-0 lg:border-l" : ""}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-brand-dark sm:h-11 sm:w-11 [&_svg]:h-5 [&_svg]:w-5 sm:[&_svg]:h-6 sm:[&_svg]:w-6">
              {service.icon}
            </span>
            <span className="leading-tight">
              <span className="block font-display text-[15px] font-bold uppercase sm:text-lg sm:tracking-wide">{service.line1}</span>
              <span className="block text-xs text-white/70 sm:text-[13px]">{service.line2}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
