import Link from "next/link";
import { listCategories } from "@/data/categories";
import {
  ActiveBadge,
  Card,
  EmptyState,
  FilterBar,
  LinkButton,
  PageHeader,
  SearchInput,
  Table,
  tdClass,
  thClass,
  trClass,
} from "@/components/admin/ui";
import { ToggleActiveButton } from "../_components/toggle-active-button";
import { deactivateCategoryAction, reactivateCategoryAction } from "./actions";

export const instant = false;

export default async function AdminCategoriesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { items, total } = await listCategories({ q });
  const mainCount = items.filter((item) => item.depth === 0).length;

  return (
    <div>
      <PageHeader
        title="Catégories"
        description="Les catégories principales forment le menu du site ; l'ordre d'affichage se règle dans chaque catégorie."
        actions={<LinkButton href="/admin/categories/new">+ Nouvelle catégorie</LinkButton>}
      />

      <Card flush>
        <FilterBar>
          <SearchInput defaultValue={q} placeholder="Rechercher une catégorie…" />
        </FilterBar>

        {items.length === 0 ? (
          <EmptyState
            title={q ? "Aucun résultat" : "Aucune catégorie"}
            description={q ? `Aucune catégorie ne correspond à « ${q} ».` : "Créez votre première catégorie pour commencer."}
            action={!q && <LinkButton href="/admin/categories/new">Créer une catégorie</LinkButton>}
          />
        ) : (
          <Table
            head={
              <>
                <th className={thClass}>Catégorie</th>
                <th className={`${thClass} text-right`}>Produits</th>
                <th className={thClass}>Statut</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </>
            }
          >
            {items.map((item) => {
              const isMain = item.depth === 0;
              return (
                <tr key={item.id} className={`${trClass} ${isMain && !q ? "bg-slate-50/60" : ""}`}>
                  <td className={tdClass}>
                    <div className="flex items-start gap-2" style={{ paddingLeft: q ? 0 : item.depth * 24 }}>
                      {!isMain && !q && (
                        <span className="mt-0.5 select-none text-slate-300" aria-hidden>
                          └
                        </span>
                      )}
                      <div>
                        <Link
                          href={`/admin/categories/${item.id}`}
                          className={`hover:text-brand-red-600 ${isMain ? "font-semibold text-brand-navy" : "font-medium text-slate-800"}`}
                        >
                          {item.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {q && item.parentName && <>{item.parentName} › </>}
                          <span className="font-mono">/{item.slug}</span>
                          {isMain && item.childCount > 0 && (
                            <> · {item.childCount} sous-catégorie{item.childCount > 1 ? "s" : ""}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdClass} text-right tabular-nums text-slate-600`}>
                    {item.totalProductCount}
                  </td>
                  <td className={tdClass}>
                    <ActiveBadge isActive={item.isActive} />
                  </td>
                  <td className={`${tdClass} text-right`}>
                    <div className="inline-flex items-start gap-2">
                      <LinkButton href={`/admin/categories/${item.id}`} variant="ghost">
                        Modifier
                      </LinkButton>
                      {item.isActive ? (
                        <ToggleActiveButton action={deactivateCategoryAction.bind(null, item.id)} label="Désactiver" tone="danger" />
                      ) : (
                        <ToggleActiveButton action={reactivateCategoryAction.bind(null, item.id)} label="Réactiver" tone="success" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}

        <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          {q
            ? `${total} résultat${total > 1 ? "s" : ""}`
            : `${mainCount} catégorie${mainCount > 1 ? "s" : ""} principale${mainCount > 1 ? "s" : ""} · ${total - mainCount} sous-catégories`}
        </div>
      </Card>
    </div>
  );
}
