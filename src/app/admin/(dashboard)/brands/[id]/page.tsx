import { notFound } from "next/navigation";
import { getBrand } from "@/data/brands";
import { ActiveBadge, PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "../../_components/delete-button";
import { BrandForm } from "../brand-form";
import { deleteBrandAction, updateBrandAction } from "../actions";

export const instant = false;

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await getBrand(id);

  if (!brand) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={brand.name}
        backHref="/admin/brands"
        backLabel="Marques"
        actions={<ActiveBadge isActive={brand.isActive} />}
      />
      <BrandForm
        action={updateBrandAction.bind(null, id)}
        submitLabel="Enregistrer"
        defaultValues={{ name: brand.name, slug: brand.slug, logoUrl: brand.logoUrl ?? "" }}
      />
      <div className="mt-8">
        <DeleteButton
          action={deleteBrandAction.bind(null, id)}
          confirmMessage="Supprimer définitivement cette marque ? Cette action est irréversible."
        />
      </div>
    </div>
  );
}
