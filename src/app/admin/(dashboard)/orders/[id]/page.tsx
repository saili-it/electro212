import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/data/orders";
import { formatMinorUnits } from "@/lib/money";
import { formatShopDateTime } from "@/lib/datetime";
import { ALLOWED_TRANSITIONS, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/orders";
import {
  Badge,
  Card,
  OrderStatusBadge,
  PageHeader,
  PaymentStatusBadge,
  Table,
  tdClass,
  thClass,
  trClass,
} from "@/components/admin/ui";
import { ToggleActiveButton } from "../../_components/toggle-active-button";
import { OrderStatusForm } from "../order-status-form";
import { changeOrderStatusAction, setPaymentStatusAction } from "../actions";

export const instant = false;

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  const allowed = ALLOWED_TRANSITIONS[order.status];
  const isPickup = order.deliveryCity === "Retrait en magasin";

  return (
    <div>
      <PageHeader
        title={order.reference}
        description={`Passée le ${formatShopDateTime(order.createdAt)}`}
        backHref="/admin/orders"
        backLabel="Commandes"
        actions={
          <>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="Articles" flush>
            <Table
              head={
                <>
                  <th className={thClass}>Produit</th>
                  <th className={`${thClass} text-right`}>Prix unit.</th>
                  <th className={`${thClass} text-right`}>Qté</th>
                  <th className={`${thClass} text-right`}>Total</th>
                </>
              }
            >
              {order.items.map((item) => (
                <tr key={item.id} className={trClass}>
                  <td className={tdClass}>
                    {item.slug ? (
                      <Link href={`/produits/${item.slug}`} className="font-medium text-slate-900 hover:text-brand-red-600" target="_blank">
                        {item.nameSnapshot}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900">{item.nameSnapshot}</span>
                    )}
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{item.skuSnapshot}</span>
                      {!item.productExists && <> · produit supprimé du catalogue</>}
                    </p>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-slate-600`}>
                    {formatMinorUnits(item.unitPriceMinorUnitsSnapshot)}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{item.quantity}</td>
                  <td className={`${tdClass} text-right font-medium tabular-nums`}>{formatMinorUnits(item.lineTotalMinorUnits)}</td>
                </tr>
              ))}
            </Table>
            <dl className="space-y-1.5 border-t border-slate-100 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Sous-total</dt>
                <dd className="tabular-nums font-medium text-slate-900">{formatMinorUnits(order.subtotalMinorUnits)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Livraison</dt>
                <dd className="font-medium text-slate-600">
                  {order.deliveryFeeMinorUnits > 0 ? formatMinorUnits(order.deliveryFeeMinorUnits) : "À confirmer"}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="tabular-nums font-bold text-slate-900">{formatMinorUnits(order.totalMinorUnits)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Historique">
            <ol className="relative space-y-4 border-l border-slate-200 pl-5">
              {order.history.map((entry) => (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand-red-600" aria-hidden />
                  <p className="text-sm font-medium text-slate-900">
                    {entry.fromStatus ? `${ORDER_STATUS_LABELS[entry.fromStatus]} → ` : ""}
                    {ORDER_STATUS_LABELS[entry.toStatus]}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatShopDateTime(entry.createdAt)}
                    {entry.adminName ? ` · ${entry.adminName}` : ""}
                  </p>
                  {entry.reason && <p className="mt-0.5 text-xs italic text-slate-600">« {entry.reason} »</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Changer le statut">
            <OrderStatusForm action={changeOrderStatusAction.bind(null, order.id)} allowed={allowed} />
          </Card>

          <Card title="Client">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Nom</dt>
                <dd className="font-medium text-slate-900">{order.contactName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Téléphone</dt>
                <dd className="font-medium text-slate-900">
                  <a href={`tel:${order.contactPhone}`} className="hover:text-brand-red-600">
                    {order.contactPhone}
                  </a>
                </dd>
              </div>
              {order.contactEmail && (
                <div>
                  <dt className="text-slate-500">E-mail</dt>
                  <dd className="font-medium text-slate-900">
                    <a href={`mailto:${order.contactEmail}`} className="hover:text-brand-red-600">
                      {order.contactEmail}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title={isPickup ? "Retrait" : "Livraison"}>
            {isPickup ? (
              <p className="text-sm text-slate-700">
                <Badge tone="navy">Retrait en magasin</Badge>
                <span className="mt-2 block text-slate-600">{order.deliveryAddressLine}</span>
              </p>
            ) : (
              <p className="text-sm text-slate-700">
                {order.deliveryAddressLine}
                <br />
                {order.deliveryCity}
              </p>
            )}
            {order.deliveryNotes && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">{order.deliveryNotes}</p>}
          </Card>

          <Card title="Paiement">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Mode</dt>
                <dd className="font-medium text-slate-900">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Statut</dt>
                <dd>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {order.paymentStatus !== "PAID" && (
                <ToggleActiveButton action={setPaymentStatusAction.bind(null, order.id, "PAID")} label="Marquer payé" tone="success" />
              )}
              {order.paymentStatus !== "PENDING" && (
                <ToggleActiveButton action={setPaymentStatusAction.bind(null, order.id, "PENDING")} label="Marquer en attente" tone="neutral" />
              )}
              {order.paymentStatus === "PAID" && (
                <ToggleActiveButton
                  action={setPaymentStatusAction.bind(null, order.id, "REFUNDED")}
                  label="Marquer remboursé"
                  tone="warning"
                  confirmMessage="Marquer cette commande comme remboursée ?"
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
