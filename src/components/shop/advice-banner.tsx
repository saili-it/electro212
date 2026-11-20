import Image from "next/image";
import { Check } from "lucide-react";
import { siteConfig, whatsappUrl } from "@/config/site";
import { formatDh } from "@/lib/money";
import { HeadsetIcon, PhoneIcon, TruckIcon, WhatsAppIcon } from "./icons";

/**
 * Closing block of the home page: a bold panel inviting visitors to ask an
 * adviser (WhatsApp or phone), beside a lifestyle photo (Unsplash, free
 * licence, in /public/home). Every claim here is already made elsewhere on
 * the site (services strip, footer, checkout).
 */
export function AdviceBanner() {
  const points = ["Livraison partout au Maroc", "Paiement à la livraison", "Garantie officielle"];

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14" aria-labelledby="advice-title">
      <div className="relative isolate overflow-hidden rounded-3xl bg-brand-red-600 text-white shadow-card lg:grid lg:grid-cols-[1.15fr_1fr]">
        {/* Photo: on top on phones, on the right from desktop; it fades into the panel colour. */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] lg:order-2 lg:aspect-auto lg:min-h-[420px]">
          <Image
            src="/home/conseil-cuisine.jpg"
            alt=""
            fill
            sizes="(min-width: 1280px) 620px, (min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          {/* Only the edge that touches the text fades to red, so the photo keeps its colours. */}
          <span
            className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-brand-red-600 to-transparent lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:h-auto lg:w-2/5 lg:bg-gradient-to-r"
            aria-hidden
          />
          <div className="absolute right-4 top-4 hidden items-center gap-3 rounded-2xl bg-white px-4 py-3 text-brand-dark shadow-pop sm:flex lg:bottom-6 lg:right-6 lg:top-auto">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-50 text-brand-green-700">
              <TruckIcon className="h-5 w-5" />
            </span>
            <span className="text-sm leading-snug">
              <span className="block font-bold">Livraison gratuite</span>
              <span className="block text-slate-500">Dès {formatDh(siteConfig.freeDeliveryThresholdMad)} d&apos;achat</span>
            </span>
          </div>
        </div>

        <div className="relative px-6 pb-8 pt-3 sm:px-10 sm:pb-10 lg:order-1 lg:py-14 lg:pr-6">
          <span className="pointer-events-none absolute -left-24 -top-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden />

          <p className="inline-flex items-center gap-2 rounded-full bg-black/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
            <HeadsetIcon className="h-4 w-4" />
            À votre écoute 24/7
          </p>
          <h2 id="advice-title" className="mt-4 font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">
            Besoin d&apos;aide pour choisir&nbsp;?
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed sm:text-base">
            Réfrigérateur, lave-linge, TV ou climatiseur&nbsp;: dites-nous ce que vous cherchez, nos conseillers vous
            orientent vers le modèle qu&apos;il vous faut.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-dark shadow-pop transition duration-200 hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="h-5 w-5 text-brand-green-700" />
              Écrire sur WhatsApp
            </a>
            <a
              href={`tel:${siteConfig.phone.e164}`}
              className="inline-flex items-center justify-center gap-2.5 rounded-full border-2 border-white px-6 py-3 text-sm font-bold text-white transition duration-200 hover:bg-white hover:text-brand-red-700"
            >
              <PhoneIcon className="h-5 w-5" />
              Appeler le {siteConfig.phone.display}
            </a>
          </div>

          <ul className="mt-7 flex flex-col gap-2.5 text-sm font-semibold sm:flex-row sm:flex-wrap sm:gap-x-5">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-brand-red-600">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
