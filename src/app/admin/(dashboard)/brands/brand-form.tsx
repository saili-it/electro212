"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "@/components/admin/action-form";
import { NameSlugFields } from "@/components/admin/slug-fields";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";
import { ImageSpecHint } from "@/components/admin/image-spec-hint";
import { IMAGE_SPECS } from "@/lib/image-specs";

export type BrandFormValues = { name: string; slug: string; logoUrl: string };

const EMPTY_VALUES: BrandFormValues = { name: "", slug: "", logoUrl: "" };

export function BrandForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: BrandFormValues;
  submitLabel: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const values = defaultValues ?? EMPTY_VALUES;
  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-6">
      <FormFeedback state={state} />
      <Card title="Informations">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <NameSlugFields
            nameField="name"
            nameLabel="Nom de la marque"
            namePlaceholder="Samsung"
            defaultName={values.name}
            defaultSlug={values.slug}
            nameError={fieldError("name")}
            slugError={fieldError("slug")}
            slugPrefix="/marques/"
          />
          <Field
            label="Logo (lien ou fichier du site)"
            htmlFor="logoUrl"
            className="md:col-span-2"
            error={fieldError("logoUrl")}
          >
            {values.logoUrl && (
              <span className="mb-2 flex h-20 w-44 items-center justify-center rounded-lg border border-slate-200 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-provided address, host not known in advance */}
                <img src={values.logoUrl} alt={`Logo actuel de ${values.name}`} className="max-h-full max-w-full object-contain" />
              </span>
            )}
            <input
              id="logoUrl"
              name="logoUrl"
              type="text"
              inputMode="url"
              placeholder="https://… ou /brands/nom.png"
              defaultValue={values.logoUrl}
              className={inputClass}
            />
            <ImageSpecHint spec={IMAGE_SPECS.brand} />
          </Field>
        </div>
      </Card>
      <FormActions pending={pending} submitLabel={submitLabel} cancelHref="/admin/brands" />
    </ActionForm>
  );
}
