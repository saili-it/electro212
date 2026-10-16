"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "@/components/admin/action-form";
import { NameSlugFields } from "@/components/admin/slug-fields";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";

export type PromotionFormValues = {
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  startsAt: string; // datetime-local, Moroccan time
  endsAt: string;
  position: number;
  heroImageUrl: string | null;
};

const EMPTY: PromotionFormValues = {
  title: "",
  slug: "",
  subtitle: "",
  description: "",
  startsAt: "",
  endsAt: "",
  position: 0,
  heroImageUrl: null,
};

const HERO_MAX_BYTES = 6 * 1024 * 1024;

export function PromotionForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: PromotionFormValues;
  submitLabel: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const values = defaultValues ?? EMPTY;
  const [preview, setPreview] = useState<string | null>(values.heroImageUrl);
  const [fileError, setFileError] = useState<string | null>(null);
  const fieldError = (name: string) => state?.fieldErrors?.[name];

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-6">
      <FormFeedback state={state} />

      <Card title="Informations">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <NameSlugFields
            nameField="title"
            nameLabel="Titre de la promotion"
            namePlaceholder="Black Friday"
            defaultName={values.title}
            defaultSlug={values.slug}
            nameError={fieldError("title")}
            slugError={fieldError("slug")}
            slugPrefix="/promotions/"
          />
          <Field label="Sous-titre (optionnel)" htmlFor="subtitle" error={fieldError("subtitle")} className="md:col-span-2">
            <input id="subtitle" name="subtitle" maxLength={200} defaultValue={values.subtitle} placeholder="Jusqu'à -50% sur une sélection" className={inputClass} />
          </Field>
          <Field label="Description (optionnel)" htmlFor="description" error={fieldError("description")} className="md:col-span-2">
            <textarea id="description" name="description" rows={3} defaultValue={values.description} placeholder="Présentez l'événement en quelques lignes." className={inputClass} />
          </Field>
          <Field label="Ordre d'affichage" htmlFor="position" hint="Plus petit = affiché en premier.">
            <input id="position" name="position" type="number" min={0} defaultValue={values.position} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Image d'en-tête (optionnel)" description="Grande bannière affichée en haut de la page promotion.">
        {preview && (
          <div className="mb-4 aspect-[16/7] w-full max-w-xl overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob / stored preview */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <Field
          label={values.heroImageUrl ? "Remplacer l'image (optionnel)" : "Image d'en-tête"}
          htmlFor="image"
          hint="JPEG, PNG ou WebP, idéalement 2000×875. Convertie et optimisée automatiquement."
          error={fileError ?? fieldError("image")}
        >
          <input
            id="image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setFileError(null);
              if (!file) {
                setPreview(values.heroImageUrl);
                return;
              }
              if (file.size > HERO_MAX_BYTES) {
                setFileError("Image trop lourde (6 Mo maximum).");
                event.target.value = "";
                setPreview(values.heroImageUrl);
                return;
              }
              setPreview(URL.createObjectURL(file));
            }}
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-red-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-red-700 hover:file:bg-brand-red-50/70"
          />
        </Field>
      </Card>

      <Card title="Programmation" description="Heure du Maroc. Laissez vide pour afficher sans limite de date.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Début" htmlFor="startsAt" hint="Masquée avant cette date." error={fieldError("startsAt")}>
            <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={values.startsAt} className={inputClass} />
          </Field>
          <Field label="Fin" htmlFor="endsAt" hint="Masquée après cette date." error={fieldError("endsAt")}>
            <input id="endsAt" name="endsAt" type="datetime-local" defaultValue={values.endsAt} className={inputClass} />
          </Field>
        </div>
      </Card>

      <FormActions pending={pending} submitLabel={submitLabel} cancelHref="/admin/promotions" />
    </ActionForm>
  );
}
