"use client";

import { useActionState, useMemo, useState } from "react";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "@/components/admin/action-form";
import { NameSlugFields } from "@/components/admin/slug-fields";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";

export type AttributeOption = {
  id: string;
  code: string;
  label: string;
  dataType: "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM";
  unit: string | null;
  enumOptions: string[];
  isRequired: boolean;
};

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  attributes: AttributeOption[];
};

/** Categories arrive in tree order: start a new group at every main (depth 0) category. */
function groupByMainCategory(categories: CategoryOption[]) {
  const groups: { root: CategoryOption; descendants: CategoryOption[] }[] = [];
  for (const category of categories) {
    if (category.depth === 0 || groups.length === 0) groups.push({ root: category, descendants: [] });
    else groups[groups.length - 1].descendants.push(category);
  }
  return groups;
}
export type BrandOption = { id: string; name: string };

export type ProductFormValues = {
  sku: string;
  slug: string;
  brandId: string;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  availableStock?: number;
  reservedQuantity?: number;
  nameFr: string;
  descriptionFr: string;
  shortDescriptionFr: string;
  seoTitleFr: string;
  seoDescriptionFr: string;
  nameAr: string;
  descriptionAr: string;
  shortDescriptionAr: string;
  seoTitleAr: string;
  seoDescriptionAr: string;
  attributeValues: Record<string, string>;
};

const EMPTY_VALUES: ProductFormValues = {
  sku: "",
  slug: "",
  brandId: "",
  primaryCategoryId: "",
  secondaryCategoryIds: [],
  price: "",
  compareAtPrice: "",
  stockQuantity: "0",
  nameFr: "",
  descriptionFr: "",
  shortDescriptionFr: "",
  seoTitleFr: "",
  seoDescriptionFr: "",
  nameAr: "",
  descriptionAr: "",
  shortDescriptionAr: "",
  seoTitleAr: "",
  seoDescriptionAr: "",
  attributeValues: {},
};

function AttributeInput({ attribute, defaultValue }: { attribute: AttributeOption; defaultValue?: string }) {
  const name = `attr_${attribute.id}`;
  const label = `${attribute.label}${attribute.isRequired ? " *" : ""}`;

  if (attribute.dataType === "BOOLEAN") {
    return (
      <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
        <input type="checkbox" name={name} defaultChecked={defaultValue === "true"} className="accent-brand-red-600" />
        {label}
      </label>
    );
  }
  if (attribute.dataType === "ENUM") {
    return (
      <Field label={label} htmlFor={name}>
        <select id={name} name={name} defaultValue={defaultValue ?? ""} className={inputClass}>
          <option value="">— Choisir —</option>
          {attribute.enumOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={label} htmlFor={name}>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={attribute.dataType === "NUMBER" ? "number" : "text"}
          step={attribute.dataType === "NUMBER" ? "any" : undefined}
          defaultValue={defaultValue ?? ""}
          className={`${inputClass} ${attribute.unit ? "pr-14" : ""}`}
        />
        {attribute.unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">
            {attribute.unit}
          </span>
        )}
      </div>
    </Field>
  );
}

function MoneyInput({
  name,
  value,
  onChange,
  required,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <input
        id={name}
        name={name}
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pr-14 tabular-nums`}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-400">MAD</span>
    </div>
  );
}

export function ProductForm({
  action,
  categories,
  brands,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  categories: CategoryOption[];
  brands: BrandOption[];
  defaultValues?: ProductFormValues;
  submitLabel: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const values = defaultValues ?? EMPTY_VALUES;
  const [primaryCategoryId, setPrimaryCategoryId] = useState(values.primaryCategoryId);
  const [locale, setLocale] = useState<"fr" | "ar">("fr");
  const [price, setPrice] = useState(values.price);
  const [compareAtPrice, setCompareAtPrice] = useState(values.compareAtPrice);
  const fieldError = (name: string) => state?.fieldErrors?.[name];

  const categoryGroups = useMemo(() => groupByMainCategory(categories), [categories]);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === primaryCategoryId),
    [categories, primaryCategoryId],
  );

  const discount = (() => {
    const p = Number(price);
    const c = Number(compareAtPrice);
    if (!compareAtPrice || !p || !c) return null;
    if (c <= p) return { invalid: true as const };
    return { percent: Math.round(((c - p) / c) * 100) };
  })();

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-6">
      <FormFeedback state={state} />

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        onInvalidCapture={(event) => {
          const target = event.target as HTMLElement;
          if (!target.closest('[dir="rtl"]')) setLocale("fr");
        }}
      >
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Fiche produit">
            <div className="mb-5 inline-flex rounded-lg bg-slate-100 p-1">
              <button type="button" onClick={() => setLocale("fr")} className={tabClass(locale === "fr")}>
                Français
              </button>
              <button type="button" onClick={() => setLocale("ar")} className={tabClass(locale === "ar")}>
                العربية <span className="text-xs text-slate-400">(optionnel)</span>
              </button>
            </div>

            {/* Both tabs stay mounted (just hidden) so every field is submitted. */}
            <div className={locale === "fr" ? "grid grid-cols-1 gap-5 md:grid-cols-2" : "hidden"}>
              <NameSlugFields
                nameField="nameFr"
                nameLabel="Nom du produit"
                namePlaceholder="Machine à laver Samsung 9 kg"
                defaultName={values.nameFr}
                defaultSlug={values.slug}
                nameError={fieldError("fr.name")}
                slugError={fieldError("slug")}
                slugPrefix="/produits/"
              />
              <Field label="Description courte" htmlFor="shortDescriptionFr" className="md:col-span-2" hint="Une phrase affichée sous le titre et dans les listes.">
                <input id="shortDescriptionFr" name="shortDescriptionFr" defaultValue={values.shortDescriptionFr} className={inputClass} />
              </Field>
              <Field label="Description" htmlFor="descriptionFr" className="md:col-span-2" hint="Texte unique, rédigé à partir des caractéristiques réelles — évitez de copier le site du fabricant.">
                <textarea id="descriptionFr" name="descriptionFr" rows={6} defaultValue={values.descriptionFr} className={inputClass} />
              </Field>
            </div>

            <div dir="rtl" className={locale === "ar" ? "grid grid-cols-1 gap-5" : "hidden"}>
              <Field label="اسم المنتج" htmlFor="nameAr">
                <input id="nameAr" name="nameAr" defaultValue={values.nameAr} className={inputClass} />
              </Field>
              <Field label="وصف قصير" htmlFor="shortDescriptionAr">
                <input id="shortDescriptionAr" name="shortDescriptionAr" defaultValue={values.shortDescriptionAr} className={inputClass} />
              </Field>
              <Field label="الوصف" htmlFor="descriptionAr">
                <textarea id="descriptionAr" name="descriptionAr" rows={6} defaultValue={values.descriptionAr} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card
            title="Caractéristiques"
            description={
              activeCategory
                ? `Champs définis pour la catégorie « ${activeCategory.name} ».`
                : "Choisissez d'abord une catégorie principale."
            }
          >
            {!activeCategory ? (
              <p className="text-sm text-slate-500">Les caractéristiques dépendent de la catégorie du produit.</p>
            ) : activeCategory.attributes.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun attribut n&apos;est associé à cette catégorie pour l&apos;instant.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeCategory.attributes.map((attribute) => (
                  <AttributeInput key={attribute.id} attribute={attribute} defaultValue={values.attributeValues[attribute.id]} />
                ))}
              </div>
            )}
          </Card>

          <Card title="Référencement (SEO)" description="Optionnel — le nom et la description courte sont utilisés par défaut.">
            <div className={locale === "fr" ? "grid grid-cols-1 gap-5" : "hidden"}>
              <Field label="Titre SEO" htmlFor="seoTitleFr" hint="Idéalement 50 à 60 caractères.">
                <input id="seoTitleFr" name="seoTitleFr" defaultValue={values.seoTitleFr} className={inputClass} />
              </Field>
              <Field label="Méta-description" htmlFor="seoDescriptionFr" hint="Idéalement 140 à 160 caractères.">
                <textarea id="seoDescriptionFr" name="seoDescriptionFr" rows={3} defaultValue={values.seoDescriptionFr} className={inputClass} />
              </Field>
            </div>
            <div dir="rtl" className={locale === "ar" ? "grid grid-cols-1 gap-5" : "hidden"}>
              <Field label="عنوان السيو" htmlFor="seoTitleAr">
                <input id="seoTitleAr" name="seoTitleAr" defaultValue={values.seoTitleAr} className={inputClass} />
              </Field>
              <Field label="وصف السيو" htmlFor="seoDescriptionAr">
                <textarea id="seoDescriptionAr" name="seoDescriptionAr" rows={3} defaultValue={values.seoDescriptionAr} className={inputClass} />
              </Field>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Prix">
            <div className="flex flex-col gap-4">
              <Field label="Prix de vente" htmlFor="price">
                <MoneyInput name="price" value={price} onChange={setPrice} required />
              </Field>
              <Field
                label="Ancien prix (barré)"
                htmlFor="compareAtPrice"
                error={fieldError("compareAtPriceMinorUnits")}
                hint="Optionnel — pour afficher une promotion."
              >
                <MoneyInput name="compareAtPrice" value={compareAtPrice} onChange={setCompareAtPrice} />
              </Field>
              {discount && "percent" in discount && (
                <p className="rounded-md bg-brand-green-50 px-3 py-2 text-sm font-medium text-brand-green-700">
                  Remise affichée : −{discount.percent} %
                </p>
              )}
              {discount && "invalid" in discount && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  L&apos;ancien prix doit être supérieur au prix de vente.
                </p>
              )}
            </div>
          </Card>

          <Card title="Stock">
            <div className="flex flex-col gap-4">
              <Field label="Référence (SKU)" htmlFor="sku" error={fieldError("sku")}>
                <input id="sku" name="sku" required defaultValue={values.sku} className={`${inputClass} font-mono`} />
              </Field>
              <Field label="Stock physique" htmlFor="stockQuantity" hint="Quantité réellement en dépôt.">
                <input
                  id="stockQuantity"
                  name="stockQuantity"
                  type="number"
                  min="0"
                  required
                  defaultValue={values.stockQuantity}
                  className={`${inputClass} tabular-nums`}
                />
              </Field>
              {values.availableStock !== undefined && (
                <dl className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Réservé</dt>
                    <dd className="font-medium tabular-nums">{values.reservedQuantity ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Disponible</dt>
                    <dd className="font-medium tabular-nums">{values.availableStock}</dd>
                  </div>
                </dl>
              )}
            </div>
          </Card>

          <Card title="Organisation">
            <div className="flex flex-col gap-4">
              <Field label="Catégorie principale" htmlFor="primaryCategoryId" error={fieldError("primaryCategoryId")} hint="Utilisée pour l'URL, le fil d'Ariane et les caractéristiques.">
                <select
                  id="primaryCategoryId"
                  name="primaryCategoryId"
                  required
                  value={primaryCategoryId}
                  onChange={(event) => setPrimaryCategoryId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">— Choisir —</option>
                  {categoryGroups.map(({ root, descendants }) =>
                    descendants.length === 0 ? (
                      <option key={root.id} value={root.id}>
                        {root.name}
                      </option>
                    ) : (
                      <optgroup key={root.id} label={root.name}>
                        {/* Products go in sub-categories; the main one only stays listed if already in use. */}
                        {primaryCategoryId === root.id && <option value={root.id}>{root.name} (catégorie principale)</option>}
                        {descendants.map((category) => (
                          <option key={category.id} value={category.id}>
                            {"  ".repeat(category.depth - 1)}
                            {category.name}
                          </option>
                        ))}
                      </optgroup>
                    ),
                  )}
                </select>
              </Field>
              <Field label="Marque" htmlFor="brandId">
                <select id="brandId" name="brandId" defaultValue={values.brandId} className={inputClass}>
                  <option value="">— Aucune —</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Afficher aussi dans" error={fieldError("secondaryCategoryIds")} hint="Ex. une plaque encastrable aussi listée dans « Cuisson ».">
                <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-2">
                  {categoryGroups.map(({ root, descendants }) => {
                    const checkbox = (category: CategoryOption) =>
                      category.id === primaryCategoryId ? null : (
                        <label
                          key={category.id}
                          className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-slate-50"
                          style={{ paddingLeft: 6 + Math.max(0, category.depth - 1) * 12 }}
                        >
                          <input
                            type="checkbox"
                            name="secondaryCategoryIds"
                            value={category.id}
                            defaultChecked={values.secondaryCategoryIds.includes(category.id)}
                            className="accent-brand-red-600"
                          />
                          {category.name}
                        </label>
                      );
                    if (descendants.length === 0) return checkbox(root);
                    return (
                      <div key={root.id} className="mb-1">
                        <p className="px-1.5 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {root.name}
                        </p>
                        {descendants.map(checkbox)}
                      </div>
                    );
                  })}
                </div>
              </Field>
            </div>
          </Card>
        </div>
      </div>

      <FormActions pending={pending} submitLabel={submitLabel} cancelHref="/admin/products" />
    </ActionForm>
  );
}
