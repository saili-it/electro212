import type { ProductStatus } from "@prisma/client";
import { getProductFormOptions, listProducts } from "@/data/products";
import {
  buttonVariants,
  Card,
  EmptyState,
  FilterBar,
  inputClass,
  LinkButton,
  PageHeader,
  Pagination,
  SearchInput,
} from "@/components/admin/ui";
import { ProductsTable } from "./products-table";

export const instant = false;

const STATUSES: ProductStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; brand?: string; page?: string }>;
}) {
  const { q, status: statusParam, category, brand, page: pageParam } = await searchParams;
  const page = Number(pageParam ?? 1) || 1;
  const status = STATUSES.includes(statusParam as ProductStatus) ? (statusParam as ProductStatus) : undefined;

  const [{ items, total, pageSize }, { categories, brands }] = await Promise.all([
    listProducts({ q, status, categoryId: category || undefined, brandId: brand || undefined, page }),
    getProductFormOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Boolean(q || status || category || brand);

  return (
    <div>
      <PageHeader
        title="Produits"
        description="Gérez les fiches, prix et stocks du catalogue."
        actions={
          <>
            {/* File-download route handler, not a page — plain anchor forces the download. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/admin/products/export" className={buttonVariants.secondary}>
              Exporter Excel
            </a>
            <LinkButton href="/admin/products/import" variant="secondary">
              Importer Excel
            </LinkButton>
            <LinkButton href="/admin/products/new">+ Nouveau produit</LinkButton>
          </>
        }
      />

      <Card flush>
        <FilterBar>
          <SearchInput defaultValue={q} placeholder="SKU ou nom du produit…" />
          <select name="status" defaultValue={status ?? ""} className={`${inputClass} sm:w-40`}>
            <option value="">Tous statuts</option>
            <option value="DRAFT">Brouillon</option>
            <option value="PUBLISHED">Publié</option>
            <option value="ARCHIVED">Archivé</option>
          </select>
          <select name="category" defaultValue={category ?? ""} className={`${inputClass} sm:w-48`}>
            <option value="">Toutes catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {"   ".repeat(c.depth)}
                {c.name}
              </option>
            ))}
          </select>
          <select name="brand" defaultValue={brand ?? ""} className={`${inputClass} sm:w-40`}>
            <option value="">Toutes marques</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </FilterBar>

        {items.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Aucun produit trouvé" : "Aucun produit"}
            description={
              hasFilters
                ? "Essayez d'élargir la recherche ou de retirer des filtres."
                : "Ajoutez un produit manuellement ou importez votre catalogue en CSV."
            }
            action={
              hasFilters ? (
                <LinkButton href="/admin/products" variant="secondary">Réinitialiser les filtres</LinkButton>
              ) : (
                <LinkButton href="/admin/products/new">Créer un produit</LinkButton>
              )
            }
          />
        ) : (
          <ProductsTable items={items} />
        )}

        <Pagination
          basePath="/admin/products"
          page={page}
          totalPages={totalPages}
          total={total}
          params={{ q, status, category, brand }}
        />
      </Card>
    </div>
  );
}
