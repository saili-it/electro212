import { PageHeader } from "@/components/admin/ui";
import { BrandForm } from "../brand-form";
import { createBrandAction } from "../actions";

export const instant = false;

export default function NewBrandPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouvelle marque" backHref="/admin/brands" backLabel="Marques" />
      <BrandForm action={createBrandAction} submitLabel="Créer la marque" />
    </div>
  );
}
