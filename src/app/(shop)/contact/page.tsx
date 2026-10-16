import type { Metadata } from "next";
import type { ReactNode } from "react";
import { mailtoUrl, mapsEmbedUrl, siteConfig, whatsappUrl } from "@/config/site";
import { ContactForm } from "@/components/shop/contact-form";
import { MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "@/components/shop/icons";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contactez ${siteConfig.name} : téléphone, WhatsApp, e-mail et adresse. Une équipe à votre écoute pour vous conseiller.`,
  alternates: { canonical: "/contact" },
};

const { address } = siteConfig;
const fullAddress = `${address.company}, ${address.line1}, ${address.postalCode} ${address.city}, ${address.country}`;

function MethodCard({
  icon,
  title,
  value,
  href,
  external,
  note,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  href: string;
  external?: boolean;
  note?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-card"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-red-50 text-brand-red-600">{icon}</span>
      <span className="text-sm font-bold text-brand-navy">{title}</span>
      <span className="text-sm font-medium text-brand-red-700 group-hover:underline">{value}</span>
      {note && <span className="text-xs text-slate-400">{note}</span>}
    </a>
  );
}

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">Contactez-nous</h1>
        <p className="mt-2 text-sm text-slate-600">
          Une question sur un produit, une commande ou la livraison ? Notre équipe vous répond par téléphone, WhatsApp ou
          e-mail.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <MethodCard
          icon={<PhoneIcon className="h-6 w-6" />}
          title="Téléphone"
          value={siteConfig.phone.display}
          href={`tel:${siteConfig.phone.e164}`}
          note="Conseil 24h/24, 7j/7"
        />
        <MethodCard
          icon={<WhatsAppIcon className="h-6 w-6" />}
          title="WhatsApp"
          value={siteConfig.phone.display}
          href={whatsappUrl()}
          external
          note="Même numéro que le téléphone"
        />
        <MethodCard
          icon={<MailIcon className="h-6 w-6" />}
          title="E-mail"
          value={siteConfig.email}
          href={mailtoUrl()}
          note="Réponse sous 24–48 h ouvrées"
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="text-lg font-extrabold text-brand-navy">Écrivez-nous</h2>
          <p className="mt-1 text-sm text-slate-500">Laissez-nous un message, nous revenons vers vous rapidement.</p>
          <div className="mt-4 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-slate-200/70">
            <ContactForm />
          </div>
        </section>

        <aside className="lg:col-span-2">
          <h2 className="text-lg font-extrabold text-brand-navy">Nous trouver</h2>
          <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70">
            <iframe
              src={mapsEmbedUrl()}
              title={`Localisation de ${address.company}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-56 w-full border-0"
            />
            <div className="p-5">
              <p className="flex items-start gap-2.5 text-sm text-slate-700">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-red-600" />
                <span>
                  <span className="block font-semibold text-brand-navy">{address.company}</span>
                  {address.line1}
                  <br />
                  {address.postalCode} {address.city}, {address.country}
                </span>
              </p>
              <a
                href={address.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-brand-navy transition hover:bg-surface"
              >
                Itinéraire sur Google Maps →
              </a>
            </div>
          </div>
        </aside>
      </div>

      <p className="sr-only">{fullAddress}</p>
    </div>
  );
}
