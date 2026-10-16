import Link from "next/link";
import { getDashboardStats } from "@/data/dashboard";
import { getOrderStats, getRecentOrders } from "@/data/orders";
import { formatMinorUnits } from "@/lib/money";
import { Card, LinkButton, OrderStatusBadge, PageHeader, tdClass, thClass, trClass, Table, EmptyState } from "@/components/admin/ui";

export const instant = false;

function StatCard({
  label,
  value,
  hint,
  href,
  tone = "slate",
}: {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  tone?: "slate" | "amber" | "red" | "green";
}) {
  const accents = {
    slate: { text: "text-brand-navy", bar: "bg-slate-200" },
    amber: { text: "text-amber-600", bar: "bg-amber-400" },
    red: { text: "text-brand-red-600", bar: "bg-brand-red" },
    green: { text: "text-brand-green-700", bar: "bg-brand-green" },
  };
  const body = (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 pt-6 shadow-sm transition hover:border-slate-300 hover:shadow">
      <span className={`absolute inset-x-0 top-0 h-1 ${accents[tone].bar}`} aria-hidden />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${accents[tone].text}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboardPage() {
  const [stats, orderStats, recentOrders] = await Promise.all([
    getDashboardStats(),
    getOrderStats(),
    getRecentOrders(6),
  ]);

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble des commandes et du catalogue."
        actions={<LinkButton href="/admin/orders">Voir les commandes</LinkButton>}
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Commandes</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          label="À confirmer"
          value={orderStats.pending}
          tone={orderStats.pending > 0 ? "red" : "slate"}
          hint="Nouvelles commandes en attente"
          href="/admin/orders?status=PENDING_CONFIRMATION"
        />
        <StatCard
          label="À traiter"
          value={orderStats.toProcess}
          tone={orderStats.toProcess > 0 ? "amber" : "slate"}
          hint="Non livrées, non annulées"
          href="/admin/orders"
        />
        <Card title="Commandes récentes" className="lg:row-span-2" flush>
          {recentOrders.length === 0 ? (
            <EmptyState title="Aucune commande" description="Les commandes de la boutique apparaîtront ici." />
          ) : (
            <Table
              head={
                <>
                  <th className={thClass}>Référence</th>
                  <th className={`${thClass} text-right`}>Total</th>
                  <th className={thClass}>Statut</th>
                </>
              }
            >
              {recentOrders.map((order) => (
                <tr key={order.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-medium text-slate-900 hover:text-brand-red-600">
                      {order.reference}
                    </Link>
                    <p className="text-xs text-slate-500">{order.contactName}</p>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-sm`}>{formatMinorUnits(order.totalMinorUnits)}</td>
                  <td className={tdClass}>
                    <OrderStatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-slate-400">Catalogue</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Produits publiés" value={stats.published} tone="green" href="/admin/products?status=PUBLISHED" />
        <StatCard label="Brouillons" value={stats.draft} tone="amber" hint="À compléter puis publier" href="/admin/products?status=DRAFT" />
        <StatCard label="Stock faible" value={stats.lowStock} tone={stats.lowStock > 0 ? "red" : "slate"} hint="Disponible ≤ seuil d'alerte" />
        <StatCard label="Sans description" value={stats.missingDescription} tone={stats.missingDescription > 0 ? "amber" : "slate"} hint="Important pour le référencement" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Catalogue" className="lg:col-span-2">
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500">Catégories actives</dt>
              <dd className="mt-1 text-xl font-semibold">{stats.categoryCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Marques actives</dt>
              <dd className="mt-1 text-xl font-semibold">{stats.brandCount}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Archivés</dt>
              <dd className="mt-1 text-xl font-semibold">{stats.archived}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Actions rapides">
          <div className="flex flex-col gap-2">
            <LinkButton href="/admin/products/new" variant="secondary">Ajouter un produit</LinkButton>
            <LinkButton href="/admin/categories/new" variant="secondary">Ajouter une catégorie</LinkButton>
            <LinkButton href="/admin/brands/new" variant="secondary">Ajouter une marque</LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
