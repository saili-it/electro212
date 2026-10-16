import Link from "next/link";
import { listPromotions } from "@/data/promotions";
import { formatShopDateTime } from "@/lib/datetime";
import { Card, EmptyState, LinkButton, PageHeader, Table, tdClass, thClass, trClass } from "@/components/admin/ui";
import { PromotionStatusBadge } from "./status-badge";

export const instant = false;

function Schedule({ startsAt, endsAt }: { startsAt: Date | null; endsAt: Date | null }) {
  if (!startsAt && !endsAt) return <span className="text-slate-400">Sans limite</span>;
  return (
    <span className="text-xs text-slate-500">
      {startsAt ? formatShopDateTime(startsAt) : "—"}
      {" → "}
      {endsAt ? formatShopDateTime(endsAt) : "—"}
    </span>
  );
}

export default async function AdminPromotionsPage() {
  const promotions = await listPromotions();

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Regroupez des produits dans un événement (Black Friday, soldes…)."
        actions={<LinkButton href="/admin/promotions/new">+ Nouvelle promotion</LinkButton>}
      />

      <Card flush>
        {promotions.length === 0 ? (
          <EmptyState
            title="Aucune promotion"
            description="Créez un événement puis ajoutez-y les produits à mettre en avant."
            action={<LinkButton href="/admin/promotions/new">Créer une promotion</LinkButton>}
          />
        ) : (
          <Table
            head={
              <>
                <th className={thClass}>Promotion</th>
                <th className={thClass}>Programmation</th>
                <th className={`${thClass} text-right`}>Produits</th>
                <th className={thClass}>Statut</th>
              </>
            }
          >
            {promotions.map((promo) => (
              <tr key={promo.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/admin/promotions/${promo.id}`} className="font-medium text-slate-900 hover:text-brand-red-600">
                    {promo.title}
                  </Link>
                  <p className="font-mono text-xs text-slate-500">/promotions/{promo.slug}</p>
                </td>
                <td className={tdClass}>
                  <Schedule startsAt={promo.startsAt} endsAt={promo.endsAt} />
                </td>
                <td className={`${tdClass} text-right tabular-nums text-slate-600`}>{promo.productCount}</td>
                <td className={tdClass}>
                  <PromotionStatusBadge status={promo.status} />
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
