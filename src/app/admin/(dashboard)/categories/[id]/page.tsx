import { notFound } from "next/navigation";
import { getCategory, listCategoryOptions } from "@/data/categories";
import { ActiveBadge, PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "../../_components/delete-button";
import { CategoryForm } from "../category-form";
import { deleteCategoryAction, updateCategoryAction } from "../actions";

export const instant = false;

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [category, parentOptions] = await Promise.all([getCategory(id), listCategoryOptions()]);

  if (!category) {
    notFound();
  }

  const fr = category.translations.find((t) => t.locale === "fr");
  const ar = category.translations.find((t) => t.locale === "ar");

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={fr?.name ?? category.slug}
        backHref="/admin/categories"
        backLabel="Catégories"
        actions={<ActiveBadge isActive={category.isActive} />}
      />
      <CategoryForm
        action={updateCategoryAction.bind(null, id)}
        parentOptions={parentOptions}
        currentId={id}
        submitLabel="Enregistrer"
        defaultValues={{
          slug: category.slug,
          parentId: category.parentId,
          position: category.position,
          imageUrl: category.imageUrl,
          nameFr: fr?.name ?? "",
          nameAr: ar?.name ?? "",
          seoTitleFr: fr?.seoTitle ?? "",
          seoDescriptionFr: fr?.seoDescription ?? "",
        }}
      />
      <div className="mt-8">
        <DeleteButton
          action={deleteCategoryAction.bind(null, id)}
          confirmMessage="Supprimer définitivement cette catégorie ? Cette action est irréversible."
        />
      </div>
    </div>
  );
}
