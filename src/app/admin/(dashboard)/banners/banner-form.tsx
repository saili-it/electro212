"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/form-errors";
import { formatShopDeadline, shopLocalToDate } from "@/lib/datetime";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";
import { PLACEMENTS, type PlacementKey } from "./placements";

export type BannerFormValues = {
  title: string;
  linkUrl: string;
  ctaLabel: string;
  footnote: string;
  headline: string;
  subtitle: string;
  startsAt: string; // datetime-local, Moroccan time
  endsAt: string;
  position: number;
  imageUrl: string | null;
};

const EMPTY: BannerFormValues = {
  title: "",
  linkUrl: "",
  ctaLabel: "J'en profite",
  footnote: "",
  headline: "",
  subtitle: "",
  startsAt: "",
  endsAt: "",
  position: 0,
  imageUrl: null,
};

const HERO_MAX_BYTES = 6 * 1024 * 1024;
const PROMO_MAX_BYTES = 5 * 1024 * 1024;

export function BannerForm({
  action,
  placementKey,
  defaultValues,
  submitLabel,
  linkSuggestions,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  placementKey: PlacementKey;
  defaultValues?: BannerFormValues;
  submitLabel: string;
  linkSuggestions: { path: string; label: string }[];
}) {
  const config = PLACEMENTS[placementKey];
  const maxBytes = placementKey === "hero" ? HERO_MAX_BYTES : PROMO_MAX_BYTES;
  const cancelHref = `/admin/banners?placement=${placementKey}`;

  const [state, dispatch, pending] = useActionState(action, null);
  const values = defaultValues ?? EMPTY;
  const [preview, setPreview] = useState<string | null>(values.imageUrl);
  const [fileError, setFileError] = useState<string | null>(null);
  const [ctaLabel, setCtaLabel] = useState(values.ctaLabel);
  const [endsAt, setEndsAt] = useState(values.endsAt);
  const [footnote, setFootnote] = useState(values.footnote);
  const [headline, setHeadline] = useState(values.headline);
  const [subtitle, setSubtitle] = useState(values.subtitle);
  const fieldError = (name: string) => state?.fieldErrors?.[name];

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const deadline = endsAt ? shopLocalToDate(endsAt) : null;

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-6">
      <FormFeedback state={state} />

      <Card title="Aperçu" description="Tel qu'affiché sur la page d'accueil.">
        {config.hasCta ? (
          <div className="max-w-xl rounded-2xl bg-white p-3 ring-1 ring-slate-200">
            <div className="flex gap-3">
              <div className={`flex ${config.previewAspect} min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs text-slate-400`}>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                ) : (
                  "Image de la publicité"
                )}
              </div>
              <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-2 text-center">
                {deadline && (
                  <p className="text-xs font-extrabold uppercase leading-tight text-brand-red-600">
                    Jusqu&apos;au
                    <br />
                    {formatShopDeadline(deadline)} !
                  </p>
                )}
                <span className="rounded-full bg-brand-red-600 px-3 py-1 text-[11px] font-bold uppercase text-white">
                  {ctaLabel || "J'en profite"}
                </span>
              </div>
            </div>
            {footnote && <p className="mt-1.5 text-right text-[10px] text-slate-500">{footnote}</p>}
          </div>
        ) : (
          <div className={`relative ${config.previewAspect} w-full overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200`}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Image de la bannière</div>
            )}
            {config.hasOverlay && (headline || subtitle || ctaLabel) && (
              <div className="absolute inset-0 flex flex-col justify-center gap-2 bg-gradient-to-r from-black/55 via-black/20 to-transparent p-5 text-white sm:p-8">
                {headline && <p className="max-w-md text-lg font-extrabold leading-tight sm:text-2xl">{headline}</p>}
                {subtitle && <p className="max-w-md text-xs text-white/90 sm:text-sm">{subtitle}</p>}
                {ctaLabel && (
                  <span className="mt-1 w-fit rounded-full bg-brand-red-600 px-4 py-1.5 text-xs font-bold text-white">
                    {ctaLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card title="Image">
        <Field
          label={values.imageUrl ? "Remplacer l'image (optionnel)" : `Image de la ${config.singular}`}
          htmlFor="image"
          hint={`${config.sizeHint} Elle sera convertie et optimisée automatiquement.`}
          error={fileError ?? fieldError("image")}
        >
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={!values.imageUrl}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileError(null);
              if (!file) {
                setPreview(values.imageUrl);
                return;
              }
              if (file.size > maxBytes) {
                setFileError(`Image trop lourde (${Math.round(maxBytes / 1024 / 1024)} Mo maximum).`);
                event.target.value = "";
                setPreview(values.imageUrl);
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-red-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-red-700 hover:file:bg-brand-red-50/70"
          />
        </Field>
      </Card>

      <Card title="Contenu et lien">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Titre" htmlFor="title" hint="Nom interne, aussi lu par les lecteurs d'écran." error={fieldError("title")} className="md:col-span-2">
            <input id="title" name="title" required defaultValue={values.title} placeholder="Offre de la rentrée" className={inputClass} />
          </Field>
          <Field
            label="Lien"
            htmlFor="linkUrl"
            hint="Une page du site (ex. /categories/televiseurs) ou une adresse https://"
            error={fieldError("linkUrl")}
            className="md:col-span-2"
          >
            <input
              id="linkUrl"
              name="linkUrl"
              required
              list="banner-link-suggestions"
              defaultValue={values.linkUrl}
              placeholder="/categories/televiseurs"
              className={`${inputClass} font-mono`}
            />
            <datalist id="banner-link-suggestions">
              {linkSuggestions.map((suggestion) => (
                <option key={suggestion.path} value={suggestion.path}>
                  {suggestion.label}
                </option>
              ))}
            </datalist>
          </Field>

          <Field label="Ordre d'affichage" htmlFor="position" hint="Plus petit = affiché en premier." className={config.hasCta ? "" : "md:col-span-2"}>
            <input id="position" name="position" type="number" min={0} defaultValue={values.position} className={inputClass} />
          </Field>

          {config.hasCta && (
            <>
              <Field label="Texte du bouton" htmlFor="ctaLabel" error={fieldError("ctaLabel")}>
                <input
                  id="ctaLabel"
                  name="ctaLabel"
                  maxLength={30}
                  value={ctaLabel}
                  onChange={(event) => setCtaLabel(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Mention légale (optionnel)" htmlFor="footnote" error={fieldError("footnote")} className="md:col-span-2">
                <input
                  id="footnote"
                  name="footnote"
                  maxLength={200}
                  value={footnote}
                  onChange={(event) => setFootnote(event.target.value)}
                  placeholder="*Sur les produits signalés. Cumulable avec les offres en cours."
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>
      </Card>

      {config.hasOverlay && (
        <Card title="Texte sur l'image (optionnel)" description="Affiché par-dessus la bannière. Laissez vide pour une image seule.">
          <div className="grid grid-cols-1 gap-5">
            <Field label="Titre" htmlFor="headline" error={fieldError("headline")} hint="Court et accrocheur (max 80 caractères).">
              <input
                id="headline"
                name="headline"
                maxLength={80}
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Équipez toute votre maison"
                className={inputClass}
              />
            </Field>
            <Field label="Sous-titre" htmlFor="subtitle" error={fieldError("subtitle")}>
              <input
                id="subtitle"
                name="subtitle"
                maxLength={160}
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                placeholder="Les grandes marques au meilleur prix"
                className={inputClass}
              />
            </Field>
            <Field label="Texte du bouton" htmlFor="ctaLabel" error={fieldError("ctaLabel")} hint="Laissez vide pour ne pas afficher de bouton.">
              <input
                id="ctaLabel"
                name="ctaLabel"
                maxLength={30}
                value={ctaLabel}
                onChange={(event) => setCtaLabel(event.target.value)}
                placeholder="Découvrir"
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
      )}

      <Card title="Programmation" description="Heure du Maroc. Laissez vide pour afficher sans limite.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Début" htmlFor="startsAt" hint="Masquée avant cette date." error={fieldError("startsAt")}>
            <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={values.startsAt} className={inputClass} />
          </Field>
          <Field
            label="Fin"
            htmlFor="endsAt"
            hint={config.hasCta ? "Affiche « Jusqu'au … » et masque l'offre ensuite." : "Masque la bannière après cette date."}
            error={fieldError("endsAt")}
          >
            <input
              id="endsAt"
              name="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <FormActions pending={pending} submitLabel={submitLabel} cancelHref={cancelHref} />
    </ActionForm>
  );
}
