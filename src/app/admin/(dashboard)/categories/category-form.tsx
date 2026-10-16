"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "@/components/admin/action-form";
import { NameSlugFields } from "@/components/admin/slug-fields";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";

export type CategoryFormValues = {
  slug: string;
  parentId: string | null;
  position: number;
  imageUrl: string | null;
  nameFr: string;
  nameAr: string;
  seoTitleFr: string;
  seoDescriptionFr: string;
};

const EMPTY_VALUES: CategoryFormValues = {
  slug: "",
  parentId: null,
  position: 0,
  imageUrl: null,
  nameFr: "",
  nameAr: "",
  seoTitleFr: "",
  seoDescriptionFr: "",
};

/** Options arrive in tree order, so a category's descendants directly follow it with a greater depth. */
function excludeSelfAndDescendants<T extends { id: string; depth: number }>(options: T[], currentId?: string) {
  if (!currentId) return options;
  const start = options.findIndex((option) => option.id === currentId);
  if (start === -1) return options;
  let end = start + 1;
  while (end < options.length && options[end].depth > options[start].depth) end += 1;
  return [...options.slice(0, start), ...options.slice(end)];
}

export function CategoryForm({
  action,
  parentOptions,
  defaultValues,
  submitLabel,
  currentId,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  parentOptions: { id: string; name: string; depth: number }[];
  defaultValues?: CategoryFormValues;
  submitLabel: string;
  currentId?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const values = defaultValues ?? EMPTY_VALUES;
  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-6">
      <FormFeedback state={state} />

      <Card title="Informations" description="Nom affiché dans les menus et l'adresse de la page.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <NameSlugFields
            nameField="nameFr"
            nameLabel="Nom (français)"
            namePlaceholder="Machines à laver"
            defaultName={values.nameFr}
            defaultSlug={values.slug}
            nameError={fieldError("nameFr")}
            slugError={fieldError("slug")}
            slugPrefix="/categories/"
          />
          <Field label="الاسم بالعربية (optionnel)" htmlFor="nameAr" className="md:col-span-2">
            <input id="nameAr" name="nameAr" dir="rtl" defaultValue={values.nameAr} className={`${inputClass} text-right`} />
          </Field>
        </div>
      </Card>

      <Card title="Organisation" description="Emplacement dans l'arborescence du catalogue.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="Catégorie parente" htmlFor="parentId" className="md:col-span-2" hint="Laissez vide pour une catégorie principale." error={fieldError("parentId")}>
            <select id="parentId" name="parentId" defaultValue={values.parentId ?? ""} className={inputClass}>
              <option value="">— Aucune (catégorie principale) —</option>
              {excludeSelfAndDescendants(parentOptions, currentId).map((option) => (
                <option key={option.id} value={option.id}>
                  {"   ".repeat(option.depth)}
                  {option.depth > 0 ? "└ " : ""}
                  {option.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ordre d'affichage" htmlFor="position" hint="Plus petit = affiché en premier.">
            <input id="position" type="number" name="position" defaultValue={values.position} className={inputClass} />
          </Field>
          <Field label="Image (URL)" htmlFor="imageUrl" className="md:col-span-3" error={fieldError("imageUrl")}>
            <input
              id="imageUrl"
              name="imageUrl"
              type="url"
              placeholder="https://…"
              defaultValue={values.imageUrl ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <Card title="Référencement (SEO)" description="Optionnel — sinon le nom de la catégorie est utilisé.">
        <div className="grid grid-cols-1 gap-5">
          <Field label="Titre SEO" htmlFor="seoTitleFr" hint="Idéalement 50 à 60 caractères.">
            <input id="seoTitleFr" name="seoTitleFr" defaultValue={values.seoTitleFr} className={inputClass} />
          </Field>
          <Field label="Méta-description" htmlFor="seoDescriptionFr" hint="Idéalement 140 à 160 caractères.">
            <textarea
              id="seoDescriptionFr"
              name="seoDescriptionFr"
              rows={3}
              defaultValue={values.seoDescriptionFr}
              className={inputClass}
            />
          </Field>
        </div>
      </Card>

      <FormActions pending={pending} submitLabel={submitLabel} cancelHref="/admin/categories" />
    </ActionForm>
  );
}
