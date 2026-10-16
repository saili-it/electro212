import Link from "next/link";
import { listAttributes } from "@/data/attributes";
import {
  ActiveBadge,
  Badge,
  Card,
  EmptyState,
  FilterBar,
  LinkButton,
  PageHeader,
  Pagination,
  SearchInput,
  Table,
  tdClass,
  thClass,
  trClass,
} from "@/components/admin/ui";
import { ToggleActiveButton } from "../_components/toggle-active-button";
import { deactivateAttributeAction, reactivateAttributeAction } from "./actions";

export const instant = false;

const TYPE_LABELS: Record<string, string> = {
  TEXT: "Texte",
  NUMBER: "Nombre",
  BOOLEAN: "Oui / Non",
  ENUM: "Liste",
};

export default async function AdminAttributesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const { items, total, pageSize } = await listAttributes({ q, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Attributs"
        description="Caractéristiques produit (capacité, BTU, couverts…) utilisées comme filtres."
        actions={<LinkButton href="/admin/attributes/new">+ Nouvel attribut</LinkButton>}
      />

      <Card flush>
        <FilterBar>
          <SearchInput defaultValue={q} placeholder="Rechercher par code ou libellé…" />
        </FilterBar>

        {items.length === 0 ? (
          <EmptyState
            title={q ? "Aucun résultat" : "Aucun attribut"}
            description={q ? `Aucun attribut ne correspond à « ${q} ».` : "Créez des attributs comme « Capacité (kg) » pour activer les filtres."}
            action={!q && <LinkButton href="/admin/attributes/new">Créer un attribut</LinkButton>}
          />
        ) : (
          <Table
            head={
              <>
                <th className={thClass}>Attribut</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Utilisation</th>
                <th className={thClass}>Statut</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </>
            }
          >
            {items.map((item) => (
              <tr key={item.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/admin/attributes/${item.id}`} className="font-medium text-slate-900 hover:text-brand-red-600">
                    {item.label}
                  </Link>
                  <p className="font-mono text-xs text-slate-500">{item.code}</p>
                </td>
                <td className={tdClass}>
                  <Badge tone="navy">{TYPE_LABELS[item.dataType] ?? item.dataType}</Badge>
                </td>
                <td className={`${tdClass} tabular-nums text-slate-600`}>{item.usageCount}</td>
                <td className={tdClass}>
                  <ActiveBadge isActive={item.isActive} />
                </td>
                <td className={`${tdClass} text-right`}>
                  <div className="inline-flex items-start gap-2">
                    <LinkButton href={`/admin/attributes/${item.id}`} variant="ghost">
                      Modifier
                    </LinkButton>
                    {item.isActive ? (
                      <ToggleActiveButton action={deactivateAttributeAction.bind(null, item.id)} label="Désactiver" tone="danger" />
                    ) : (
                      <ToggleActiveButton action={reactivateAttributeAction.bind(null, item.id)} label="Réactiver" tone="success" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination basePath="/admin/attributes" page={page} totalPages={totalPages} total={total} params={{ q }} />
      </Card>
    </div>
  );
}
