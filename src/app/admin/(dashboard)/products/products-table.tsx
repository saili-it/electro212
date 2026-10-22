"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProductStatus } from "@prisma/client";
import { formatMinorUnits } from "@/lib/money";
import { Alert, buttonVariants, ProductStatusBadge, Table, tdClass, thClass, trClass } from "@/components/admin/ui";
import { bulkDeleteProductsAction } from "./actions";
import type { BulkDeleteResult } from "@/data/products";

export type ProductRow = {
  id: string;
  sku: string;
  name: string;
  brandName: string | null;
  categoryName: string;
  status: ProductStatus;
  priceMinorUnits: number;
  availableStock: number;
};

function StockCell({ value }: { value: number }) {
  const tone = value <= 0 ? "text-red-600" : value <= 3 ? "text-amber-600" : "text-slate-700";
  return <span className={`font-medium tabular-nums ${tone}`}>{value <= 0 ? "Rupture" : value}</span>;
}

export function ProductsTable({ items }: { items: ProductRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkDeleteResult | null>(null);
  const [pending, startTransition] = useTransition();

  const allChecked = items.length > 0 && items.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(items.map((i) => i.id)));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onBulkDelete = () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = window.confirm(
      `Supprimer définitivement ${ids.length} produit(s) ? Action irréversible. L'historique des commandes est conservé.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await bulkDeleteProductsAction(ids);
      setResult(res);
      setSelected(new Set());
      router.refresh();
    });
  };

  return (
    <>
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-sm font-medium text-slate-600">{selected.size} sélectionné(s)</span>
          <button type="button" onClick={onBulkDelete} disabled={pending} className={buttonVariants.danger}>
            {pending ? "Suppression…" : "Supprimer la sélection"}
          </button>
        </div>
      )}

      {result && (
        <div className="px-4 pt-3">
          <Alert tone="success">{result.deleted} produit(s) supprimé(s).</Alert>
        </div>
      )}

      <Table
        head={
          <>
            <th className={`${thClass} w-10`}>
              <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Tout sélectionner" className="align-middle" />
            </th>
            <th className={thClass}>Produit</th>
            <th className={thClass}>Catégorie</th>
            <th className={`${thClass} text-right`}>Prix</th>
            <th className={`${thClass} text-right`}>Stock dispo.</th>
            <th className={thClass}>Statut</th>
          </>
        }
      >
        {items.map((item) => (
          <tr key={item.id} className={trClass}>
            <td className={tdClass}>
              <input
                type="checkbox"
                checked={selected.has(item.id)}
                onChange={() => toggle(item.id)}
                aria-label={`Sélectionner ${item.name}`}
                className="align-middle"
              />
            </td>
            <td className={tdClass}>
              <Link href={`/admin/products/${item.id}`} className="font-medium text-slate-900 hover:text-brand-red-600">
                {item.name}
              </Link>
              <p className="text-xs text-slate-500">
                <span className="font-mono">{item.sku}</span>
                {item.brandName && <> · {item.brandName}</>}
              </p>
            </td>
            <td className={`${tdClass} text-slate-600`}>{item.categoryName}</td>
            <td className={`${tdClass} text-right font-medium tabular-nums`}>{formatMinorUnits(item.priceMinorUnits)}</td>
            <td className={`${tdClass} text-right`}>
              <StockCell value={item.availableStock} />
            </td>
            <td className={tdClass}>
              <ProductStatusBadge status={item.status} />
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
