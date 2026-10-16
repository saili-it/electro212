import type { ReactNode } from "react";

/** Shared shell + prose styling for static legal pages (mentions légales, CGV…). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">{title}</h1>
      <p className="mt-2 text-xs text-slate-400">Dernière mise à jour : {updated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-600 [&_a]:font-medium [&_a]:text-brand-red-700 [&_a]:underline [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-brand-navy [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-brand-navy [&_strong]:font-semibold [&_strong]:text-brand-navy [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

/** One line of a definition list; renders a muted "À compléter" when the value is empty. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 font-semibold text-brand-navy sm:w-52">{label}</dt>
      <dd className={value ? "" : "italic text-slate-400"}>{value || "À compléter"}</dd>
    </div>
  );
}
