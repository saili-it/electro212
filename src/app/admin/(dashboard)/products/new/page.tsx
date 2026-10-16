import { getProductFormOptions } from "@/data/products";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "../product-form";
import { createProductAction } from "../actions";

export const instant = false;

export default async function NewProductPage() {
  const { categories, brands } = await getProductFormOptions();

  return (
    <div>
      <PageHeader
        title="Nouveau produit"
        description="Le produit est créé en brouillon : il ne sera visible sur le site qu'après publication."
        backHref="/admin/products"
        backLabel="Produits"
      />
      <ProductForm action={createProductAction} categories={categories} brands={brands} submitLabel="Créer le brouillon" />
    </div>
  );
}
