import { listCategoryOptions } from "@/data/categories";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../actions";

export const instant = false;

export default async function NewCategoryPage() {
  const parentOptions = await listCategoryOptions();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouvelle catégorie" backHref="/admin/categories" backLabel="Catégories" />
      <CategoryForm action={createCategoryAction} parentOptions={parentOptions} submitLabel="Créer la catégorie" />
    </div>
  );
}
