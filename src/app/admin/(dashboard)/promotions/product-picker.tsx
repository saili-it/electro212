"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import type { FormState } from "@/lib/form-errors";
import { inputClass } from "@/components/admin/ui";

type Option = { id: string; name: string; sku: string; status: string };

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Searchable list to add products to a promotion. `options` already excludes products already in it. */
export function ProductPicker({
  addAction,
  options,
}: {
  addAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  options: Option[];
}) {
  const [state, dispatch, pending] = useActionState(addAction, null);
  const [q, setQ] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const terms = normalize(q).split(/\s+/).filter(Boolean);
    const base =
      terms.length === 0
        ? options
        : options.filter((o) => {
            const hay = normalize(`${o.name} ${o.sku}`);
            return terms.every((t) => hay.includes(t));
          });
    return base.slice(0, 40);
  }, [q, options]);

  function add(id: string) {
    setAddingId(id);
    const formData = new FormData();
    formData.set("productId", id);
    startTransition(() => dispatch(formData));
  }

  return (
    <div className="flex flex-col gap-3">
      {state?.error && <p className="text-xs font-medium text-red-600">{state.error}</p>}
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher par nom ou SKU…"
        className={inputClass}
      />
      {options.length === 0 ? (
        <p className="text-sm text-slate-500">Tous les produits disponibles sont déjà dans cette promotion.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500">Aucun produit ne correspond.</li>
          ) : (
            filtered.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">{o.name}</span>
                  <span className="font-mono text-xs text-slate-400">
                    {o.sku}
                    {o.status !== "PUBLISHED" && " · brouillon"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => add(o.id)}
                  disabled={pending}
                  className="shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                >
                  {pending && addingId === o.id ? "…" : "Ajouter"}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
