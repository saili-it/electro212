"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/form-errors";
import { slugify } from "@/lib/slug";
import { ActionForm } from "@/components/admin/action-form";
import { Card, Field, FormActions, FormFeedback, inputClass } from "@/components/admin/ui";

type DataType = "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM";

export type AttributeFormValues = {
  code: string;
  label: string;
  dataType: DataType;
  unit: string;
  enumOptions: string[];
  isFilterable: boolean;
};

const EMPTY_VALUES: AttributeFormValues = {
  code: "",
  label: "",
  dataType: "TEXT",
  unit: "",
  enumOptions: [],
  isFilterable: true,
};

const TYPES: { value: DataType; label: string; example: string }[] = [
  { value: "NUMBER", label: "Nombre", example: "Capacité : 9 kg, 12000 BTU" },
  { value: "ENUM", label: "Liste de choix", example: "Type : No Frost, Statique…" },
  { value: "BOOLEAN", label: "Oui / Non", example: "Inverter, Smart TV" },
  { value: "TEXT", label: "Texte libre", example: "Référence fabricant" },
];

const toCode = (label: string) => slugify(label).replace(/-/g, "_").replace(/^[^a-z]+/, "");

export function AttributeForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: AttributeFormValues;
  submitLabel: string;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const values = defaultValues ?? EMPTY_VALUES;
  const [dataType, setDataType] = useState<DataType>(values.dataType);
  const [code, setCode] = useState(values.code);
  const [codeTouched, setCodeTouched] = useState(values.code !== "");
  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-6">
      <FormFeedback state={state} />

      <Card title="Informations">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Libellé" htmlFor="label" hint="Tel qu'affiché aux clients." error={fieldError("label")}>
            <input
              id="label"
              name="label"
              required
              placeholder="Capacité de lavage"
              defaultValue={values.label}
              onChange={(event) => {
                if (!codeTouched) setCode(toCode(event.target.value));
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Code interne" htmlFor="code" hint="Utilisé pour l'import CSV (colonne attr:code)." error={fieldError("code")}>
            <input
              id="code"
              name="code"
              required
              value={code}
              placeholder="capacite_kg"
              onChange={(event) => {
                setCode(event.target.value);
                setCodeTouched(true);
              }}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
      </Card>

      <Card title="Type de valeur">
        <fieldset>
          <legend className="sr-only">Type de valeur</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition ${
                  dataType === type.value
                    ? "border-brand-red bg-brand-red-50 ring-1 ring-brand-red"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="dataType"
                  value={type.value}
                  checked={dataType === type.value}
                  onChange={() => setDataType(type.value)}
                  className="mt-0.5 accent-brand-red-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{type.label}</span>
                  <span className="block text-xs text-slate-500">{type.example}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {dataType === "NUMBER" && (
            <Field label="Unité" htmlFor="unit" hint="kg, L, BTU, pouces, W…">
              <input id="unit" name="unit" defaultValue={values.unit} className={inputClass} />
            </Field>
          )}
          {dataType === "ENUM" && (
            <Field
              label="Choix possibles"
              htmlFor="enumOptions"
              hint="Un choix par ligne."
              error={fieldError("enumOptions")}
              className="md:col-span-2"
            >
              <textarea
                id="enumOptions"
                name="enumOptions"
                rows={5}
                placeholder={"No Frost\nStatique\nCombiné"}
                defaultValue={values.enumOptions.join("\n")}
                className={inputClass}
              />
            </Field>
          )}
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-lg bg-slate-50 p-4">
          <input type="checkbox" name="isFilterable" defaultChecked={values.isFilterable} className="mt-0.5 accent-brand-red-600" />
          <span>
            <span className="block text-sm font-medium text-slate-900">Utiliser comme filtre</span>
            <span className="block text-xs text-slate-500">
              Affiché dans la barre de filtres des catégories qui utilisent cet attribut.
            </span>
          </span>
        </label>
      </Card>

      <FormActions pending={pending} submitLabel={submitLabel} cancelHref="/admin/attributes" />
    </ActionForm>
  );
}
