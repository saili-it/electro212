"use client";

import { useActionState } from "react";
import {
  Alert,
  Badge,
  buttonVariants,
  inputClass,
  Table,
  tdClass,
  thClass,
  trClass,
} from "@/components/admin/ui";
import { commitImportAction, previewImportAction } from "./actions";
import type { PreviewRow } from "@/data/product-io";

function ActionBadge({ action }: { action: PreviewRow["action"] }) {
  if (action === "create") return <Badge tone="green">Création</Badge>;
  if (action === "update") return <Badge tone="navy">Mise à jour</Badge>;
  return <Badge tone="red">Erreur</Badge>;
}

export function ImportForm() {
  const [preview, previewFormAction, previewing] = useActionState(previewImportAction, null);
  const [result, commitFormAction, committing] = useActionState(commitImportAction, null);

  // The commit result is a superset of the preview, so prefer it once it exists.
  const view = result ?? preview;
  const done = result !== null && !result.fatalError;
  const canApply = preview !== null && !preview.fatalError && !done && preview.errorCount < preview.totalRows;

  return (
    <form className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          Fichier Excel (.xlsx)
        </label>
        <input id="file" name="file" type="file" accept=".xlsx" required className={inputClass} />
        <p className="text-xs text-slate-500">
          Exportez d&apos;abord le catalogue pour obtenir le modèle exact des colonnes, modifiez-le, puis importez-le.
          Les lignes sont rapprochées par <span className="font-mono">SKU</span> (mise à jour si le SKU existe, sinon création en brouillon).
          Une cellule vide conserve la valeur actuelle.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="submit" formAction={previewFormAction} disabled={previewing || committing} className={buttonVariants.secondary}>
          {previewing ? "Analyse…" : "Prévisualiser"}
        </button>
        {canApply && (
          <button type="submit" formAction={commitFormAction} disabled={committing} className={buttonVariants.primary}>
            {committing ? "Import en cours…" : `Confirmer l'import (${preview.createCount + preview.updateCount})`}
          </button>
        )}
      </div>

      {view?.fatalError && <Alert tone="error">{view.fatalError}</Alert>}

      {done && result && (
        <Alert tone="success">
          Import terminé : {result.applied} ligne(s) enregistrée(s)
          {result.failed > 0 ? `, ${result.failed} en erreur.` : "."}
        </Alert>
      )}

      {view && !view.fatalError && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{view.totalRows} ligne(s) :</span>
            <Badge tone="green">{view.createCount} à créer</Badge>
            <Badge tone="navy">{view.updateCount} à mettre à jour</Badge>
            {view.errorCount > 0 && <Badge tone="red">{view.errorCount} en erreur</Badge>}
          </div>

          {view.unknownColumns.length > 0 && (
            <Alert tone="error">
              Colonnes ignorées (non reconnues) : {view.unknownColumns.join(", ")}
            </Alert>
          )}

          {view.rows.length > 0 && (
            <Table
              head={
                <>
                  <th className={thClass}>Ligne</th>
                  <th className={thClass}>SKU</th>
                  <th className={thClass}>Nom</th>
                  <th className={thClass}>Action</th>
                  <th className={thClass}>Détails</th>
                </>
              }
            >
              {view.rows.map((row) => (
                <tr key={row.rowNumber} className={trClass}>
                  <td className={`${tdClass} tabular-nums text-slate-500`}>{row.rowNumber}</td>
                  <td className={`${tdClass} font-mono`}>{row.sku || "—"}</td>
                  <td className={tdClass}>{row.name || "—"}</td>
                  <td className={tdClass}>
                    <ActionBadge action={row.action} />
                  </td>
                  <td className={`${tdClass} text-slate-600`}>{row.messages.join(" · ") || "—"}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}
    </form>
  );
}
