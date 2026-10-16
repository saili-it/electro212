"use client";

import { useState } from "react";
import { slugify } from "@/lib/slug";
import { Field, inputClass } from "./ui";

/**
 * Name + slug pair: the slug follows the name until the user edits it by hand,
 * and existing records keep their slug (changing a live URL hurts SEO).
 */
export function NameSlugFields({
  nameField,
  nameLabel,
  defaultName,
  defaultSlug,
  nameError,
  slugError,
  slugPrefix = "/",
  namePlaceholder,
}: {
  nameField: string;
  nameLabel: string;
  defaultName: string;
  defaultSlug: string;
  nameError?: string;
  slugError?: string;
  slugPrefix?: string;
  namePlaceholder?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [slugTouched, setSlugTouched] = useState(defaultSlug !== "");

  return (
    <>
      <Field label={nameLabel} htmlFor={nameField} error={nameError}>
        <input
          id={nameField}
          name={nameField}
          value={name}
          required
          placeholder={namePlaceholder}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          className={inputClass}
        />
      </Field>
      <Field
        label="Adresse (slug)"
        htmlFor="slug"
        error={slugError}
        hint={slugTouched ? "Modifier l'adresse d'une page déjà publiée peut nuire au référencement." : "Générée automatiquement à partir du nom."}
      >
        <div className="flex rounded-lg shadow-sm">
          <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
            {slugPrefix}
          </span>
          <input
            id="slug"
            name="slug"
            value={slug}
            required
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugTouched(true);
            }}
            className={`${inputClass} rounded-l-none font-mono shadow-none`}
          />
        </div>
      </Field>
    </>
  );
}
