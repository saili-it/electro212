"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, buttonVariants, inputClass, Table, tdClass, thClass, trClass } from "@/components/admin/ui";
import { commitPromotionImportAction, previewPromotionImportAction } from "./import-actions";
import type { PromotionImportPreview, PromotionImportResult, PromotionImportRow } from "@/data/promotion-io";

function ActionBadge({ action }: { action: PromotionImportRow["action"] }) {
  if (action === "add") return <Badge tone="green">À ajouter</Badge>;
  if (action === "already") return <Badge tone="gray">Déjà présent</Badge>;
  return <Badge tone="red">Erreur</Badge>;
}

export function PromotionImport({ promotionId }: { promotionId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PromotionImportPreview | null>(null);
  const [result, setResult] = useState<PromotionImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  const buildForm = () => {
    const fd = new FormData();
    if (file) fd.append("file", file);
    fd.append("promotionId", promotionId);
    return fd;
  };

  const doPreview = () => {
    if (!file) return;
    startTransition(async () => {
      setResult(null);
      setPreview(await previewPromotionImportAction(buildForm()));
    });
  };

  const doCommit = () => {
    if (!file) return;
    startTransition(async () => {
      const res = await commitPromotionImportAction(buildForm());
      setResult(res);
      setPreview(null);
      if (res.added > 0) router.refresh();
    });
  };

  const view = result ?? preview;
  const canApply = preview !== null && !preview.fatalError && preview.addCount > 0 && result === null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className={`${inputClass} sm:max-w-xs`}
          disabled={pending}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setPreview(null);
            setResult(null);
          }}
        />
        <button type="button" onClick={doPreview} disabled={pending || !file} className={buttonVariants.secondary}>
          {pending && !result ? "Analyse…" : "Prévisualiser"}
        </button>
        {canApply && (
          <button type="button" onClick={doCommit} disabled={pending} className={buttonVariants.primary}>
            {pending ? "Ajout…" : `Confirmer l'ajout (${preview.addCount})`}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Fichier .xlsx avec une colonne <span className="font-mono">SKU</span>. Les produits sont rapprochés par SKU et
        ajoutés à cette promotion (prix géré sur chaque fiche produit).
      </p>

      {view?.fatalError && <Alert tone="error">{view.fatalError}</Alert>}

      {result && !result.fatalError && (
        <Alert tone="success">
          {result.added} produit(s) ajouté(s) à la promotion
          {result.errorCount > 0 ? `, ${result.errorCount} SKU(s) introuvable(s).` : "."}
        </Alert>
      )}

      {view && !view.fatalError && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{view.total} ligne(s) :</span>
            <Badge tone="green">{view.addCount} à ajouter</Badge>
            <Badge tone="gray">{view.alreadyCount} déjà présent(s)</Badge>
            {view.errorCount > 0 && <Badge tone="red">{view.errorCount} en erreur</Badge>}
          </div>
          {view.rows.length > 0 && (
            <Table
              head={
                <>
                  <th className={thClass}>Ligne</th>
                  <th className={thClass}>SKU</th>
                  <th className={thClass}>Nom</th>
                  <th className={thClass}>Action</th>
                </>
              }
            >
              {view.rows.map((row) => (
                <tr key={`${row.rowNumber}-${row.sku}`} className={trClass}>
                  <td className={`${tdClass} tabular-nums text-slate-500`}>{row.rowNumber}</td>
                  <td className={`${tdClass} font-mono`}>{row.sku || "—"}</td>
                  <td className={tdClass}>{row.name || "—"}</td>
                  <td className={tdClass}>
                    <ActionBadge action={row.action} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
