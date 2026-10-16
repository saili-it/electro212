"use client";

import { useState } from "react";
import { mailtoUrl, siteConfig, whatsappUrl } from "@/config/site";
import { WhatsAppIcon } from "./icons";

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-soft transition focus:border-brand-red focus:outline-none focus:ring-4 focus:ring-brand-red/10";

/**
 * A no-backend contact form: it composes the visitor's message and sends it via
 * WhatsApp or the e-mail client — matching Electro212's WhatsApp/phone-first flow.
 */
export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const ready = message.trim().length > 0;
  const lines = [`Bonjour ${siteConfig.name},`];
  if (name.trim()) lines.push(`Je suis ${name.trim()}${phone.trim() ? ` (${phone.trim()})` : ""}.`);
  lines.push("", message.trim());
  const body = lines.join("\n");

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-name" className="text-sm font-medium text-brand-navy">
            Nom <span className="font-normal text-slate-400">(facultatif)</span>
          </label>
          <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="c-phone" className="text-sm font-medium text-brand-navy">
            Téléphone <span className="font-normal text-slate-400">(facultatif)</span>
          </label>
          <input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 00 00 00 00" className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-message" className="text-sm font-medium text-brand-navy">
          Votre message
        </label>
        <textarea
          id="c-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Comment pouvons-nous vous aider ?"
          className={`${inputClass} h-auto py-3`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={!ready}
          onClick={() => window.open(whatsappUrl(body), "_blank", "noopener,noreferrer")}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-full bg-brand-green px-6 py-3.5 text-sm font-semibold text-white shadow-pop transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Envoyer sur WhatsApp
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            window.location.href = mailtoUrl("Demande via le site Electro212", body);
          }}
          className="flex flex-1 items-center justify-center gap-2.5 rounded-full border border-slate-200 px-6 py-3.5 text-sm font-semibold text-brand-navy transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
        >
          Envoyer par e-mail
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Le bouton ouvre WhatsApp ou votre messagerie avec le message pré-rempli. Pour une réponse immédiate, appelez-nous.
      </p>
    </form>
  );
}
