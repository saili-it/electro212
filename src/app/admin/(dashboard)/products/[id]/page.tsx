import { notFound } from "next/navigation";
import { getProduct, getProductFormOptions } from "@/data/products";
import { toMajorUnits } from "@/lib/money";
import { PageHeader, ProductStatusBadge } from "@/components/admin/ui";
import { ToggleActiveButton } from "../../_components/toggle-active-button";
import { ProductForm } from "../product-form";
import { archiveProductAction, publishProductAction, unpublishProductAction, updateProductAction } from "../actions";

export const instant = false;

function attributeValueToString(value: {
  valueText: string | null;
  valueNumber: unknown;
  valueBoolean: boolean | null;
}): string {
  if (value.valueText !== null) return value.valueText;
  if (value.valueNumber !== null && value.valueNumber !== undefined) return String(value.valueNumber);
  if (value.valueBoolean !== null) return value.valueBoolean ? "true" : "false";
  return "";
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, { categories, brands }] = await Promise.all([getProduct(id), getProductFormOptions()]);

  if (!product) {
    notFound();
  }

  const fr = product.translations.find((t) => t.locale === "fr");
  const ar = product.translations.find((t) => t.locale === "ar");
  const stockQuantity = product.inventory?.stockQuantity ?? 0;
  const reservedQuantity = product.inventory?.reservedQuantity ?? 0;

  return (
    <div>
      <PageHeader
        title={fr?.name ?? product.sku}
        description={`SKU ${product.sku}`}
        backHref="/admin/products"
        backLabel="Produits"
        actions={
          <>
            <ProductStatusBadge status={product.status} />
            {product.status === "DRAFT" && (
              <ToggleActiveButton action={publishProductAction.bind(null, id)} label="Publier" tone="success" />
            )}
            {product.status === "PUBLISHED" && (
              <ToggleActiveButton action={unpublishProductAction.bind(null, id)} label="Repasser en brouillon" tone="warning" />
            )}
            {product.status === "ARCHIVED" && (
              <ToggleActiveButton action={unpublishProductAction.bind(null, id)} label="Restaurer en brouillon" tone="neutral" />
            )}
            {product.status !== "ARCHIVED" && (
              <ToggleActiveButton
                action={archiveProductAction.bind(null, id)}
                label="Archiver"
                tone="danger"
                confirmMessage="Archiver ce produit ? Il ne sera plus visible sur le site (l'historique des commandes est conservé)."
              />
            )}
          </>
        }
      />

      <ProductForm
        action={updateProductAction.bind(null, id)}
        categories={categories}
        brands={brands}
        submitLabel="Enregistrer"
        defaultValues={{
          sku: product.sku,
          slug: product.slug,
          brandId: product.brandId ?? "",
          primaryCategoryId: product.primaryCategoryId,
          secondaryCategoryIds: product.categories.map((c) => c.categoryId),
          price: String(toMajorUnits(product.priceMinorUnits)),
          compareAtPrice: product.compareAtPriceMinorUnits ? String(toMajorUnits(product.compareAtPriceMinorUnits)) : "",
          stockQuantity: String(stockQuantity),
          reservedQuantity,
          availableStock: stockQuantity - reservedQuantity,
          nameFr: fr?.name ?? "",
          descriptionFr: fr?.description ?? "",
          shortDescriptionFr: fr?.shortDescription ?? "",
          seoTitleFr: fr?.seoTitle ?? "",
          seoDescriptionFr: fr?.seoDescription ?? "",
          nameAr: ar?.name ?? "",
          descriptionAr: ar?.description ?? "",
          shortDescriptionAr: ar?.shortDescription ?? "",
          seoTitleAr: ar?.seoTitle ?? "",
          seoDescriptionAr: ar?.seoDescription ?? "",
          attributeValues: Object.fromEntries(
            product.attributeValues.map((value) => [value.attributeId, attributeValueToString(value)]),
          ),
        }}
      />
    </div>
  );
}
