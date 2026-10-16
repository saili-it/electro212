import { PageHeader } from "@/components/admin/ui";
import { PromotionForm } from "../promotion-form";
import { createPromotionAction } from "../actions";

export const instant = false;

export default function NewPromotionPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Nouvelle promotion"
        description="Créez l'événement, puis ajoutez-y des produits."
        backHref="/admin/promotions"
        backLabel="Promotions"
      />
      <PromotionForm action={createPromotionAction} submitLabel="Créer la promotion" />
    </div>
  );
}
