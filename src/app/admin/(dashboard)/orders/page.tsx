import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { listOrders } from "@/data/orders";
import { formatMinorUnits } from "@/lib/money";
import { formatShopDateTime } from "@/lib/datetime";
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import {
  Card,
  EmptyState,
  FilterBar,
  inputClass,
  OrderStatusBadge,
  PageHeader,
  Pagination,
  PaymentStatusBadge,
  SearchInput,
  Table,
  tdClass,
  thClass,
  trClass,
} from "@/components/admin/ui";

export const instant = false;

const STATUS_OPTIONS = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status: statusParam, page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const status = STATUS_OPTIONS.includes(statusParam as OrderStatus) ? (statusParam as OrderStatus) : undefined;

  const { items, total, pageSize } = await listOrders({ q, status, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(q || status);

  return (
    <div>
      <PageHeader title="Commandes" description="Suivez et traitez les commandes de la boutique." />

      <Card flush>
        <FilterBar>
          <SearchInput defaultValue={q} placeholder="Référence, nom ou téléphone…" />
          <select name="status" defaultValue={status ?? ""} className={`${inputClass} sm:w-52`}>
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </FilterBar>

        {items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Aucune commande trouvée" : "Aucune commande"}
            description={
              hasFilters
                ? "Essayez d'élargir la recherche ou de retirer des filtres."
                : "Les commandes passées depuis la boutique apparaîtront ici."
            }
          />
        ) : (
          <Table
            head={
              <>
                <th className={thClass}>Référence</th>
                <th className={thClass}>Client</th>
                <th className={`${thClass} text-right`}>Articles</th>
                <th className={`${thClass} text-right`}>Total</th>
                <th className={thClass}>Paiement</th>
                <th className={thClass}>Statut</th>
              </>
            }
          >
            {items.map((item) => (
              <tr key={item.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/admin/orders/${item.id}`} className="font-mono font-medium text-slate-900 hover:text-brand-red-600">
                    {item.reference}
                  </Link>
                  <p className="text-xs text-slate-500">{formatShopDateTime(item.createdAt)}</p>
                </td>
                <td className={tdClass}>
                  <p className="font-medium text-slate-900">{item.contactName}</p>
                  <p className="text-xs text-slate-500">{item.contactPhone}</p>
                </td>
                <td className={`${tdClass} text-right tabular-nums text-slate-600`}>{item.itemCount}</td>
                <td className={`${tdClass} text-right font-medium tabular-nums`}>{formatMinorUnits(item.totalMinorUnits)}</td>
                <td className={tdClass}>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">{PAYMENT_METHOD_LABELS[item.paymentMethod]}</span>
                    <PaymentStatusBadge status={item.paymentStatus} />
                  </div>
                </td>
                <td className={tdClass}>
                  <OrderStatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination basePath="/admin/orders" page={page} totalPages={totalPages} total={total} params={{ q, status }} />
      </Card>
    </div>
  );
}
