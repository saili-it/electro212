import Link from "next/link";
import { listBrands } from "@/data/brands";
import {
  ActiveBadge,
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
import { deactivateBrandAction, reactivateBrandAction } from "./actions";

export const instant = false;

export default async function AdminBrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const { items, total, pageSize } = await listBrands({ q, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <PageHeader
        title="Marques"
        description="Les marques affichées sur les fiches produits et les pages marque."
        actions={<LinkButton href="/admin/brands/new">+ Nouvelle marque</LinkButton>}
      />

      <Card flush>
        <FilterBar>
          <SearchInput defaultValue={q} placeholder="Rechercher une marque…" />
        </FilterBar>

        {items.length === 0 ? (
          <EmptyState
            title={q ? "Aucun résultat" : "Aucune marque"}
            description={q ? `Aucune marque ne correspond à « ${q} ».` : "Ajoutez Samsung, LG, Beko… pour les associer aux produits."}
            action={!q && <LinkButton href="/admin/brands/new">Créer une marque</LinkButton>}
          />
        ) : (
          <Table
            head={
              <>
                <th className={thClass}>Marque</th>
                <th className={thClass}>Produits</th>
                <th className={thClass}>Statut</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </>
            }
          >
            {items.map((item) => (
              <tr key={item.id} className={trClass}>
                <td className={tdClass}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                      {item.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/admin/brands/${item.id}`} className="font-medium text-slate-900 hover:text-brand-red-600">
                        {item.name}
                      </Link>
                      <p className="font-mono text-xs text-slate-500">/{item.slug}</p>
                    </div>
                  </div>
                </td>
                <td className={`${tdClass} tabular-nums text-slate-600`}>{item.productCount}</td>
                <td className={tdClass}>
                  <ActiveBadge isActive={item.isActive} />
                </td>
                <td className={`${tdClass} text-right`}>
                  <div className="inline-flex items-start gap-2">
                    <LinkButton href={`/admin/brands/${item.id}`} variant="ghost">
                      Modifier
                    </LinkButton>
                    {item.isActive ? (
                      <ToggleActiveButton action={deactivateBrandAction.bind(null, item.id)} label="Désactiver" tone="danger" />
                    ) : (
                      <ToggleActiveButton action={reactivateBrandAction.bind(null, item.id)} label="Réactiver" tone="success" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}

        <Pagination basePath="/admin/brands" page={page} totalPages={totalPages} total={total} params={{ q }} />
      </Card>
    </div>
  );
}
