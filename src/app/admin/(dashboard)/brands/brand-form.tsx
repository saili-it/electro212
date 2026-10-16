"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "@/components/admin/action-form";
import { NameSlugFields } from "@/components/admin/slug-fields";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";

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
            label="Logo (URL)"
            htmlFor="logoUrl"
            className="md:col-span-2"
            hint="Format recommandé : SVG ou PNG transparent, 200×100."
            error={fieldError("logoUrl")}
          >
            <input id="logoUrl" name="logoUrl" type="url" placeholder="https://…" defaultValue={values.logoUrl} className={inputClass} />
          </Field>
        </div>
      </Card>
      <FormActions pending={pending} submitLabel={submitLabel} cancelHref="/admin/brands" />
    </ActionForm>
  );
}
