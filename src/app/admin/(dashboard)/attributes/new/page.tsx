import { PageHeader } from "@/components/admin/ui";
import { AttributeForm } from "../attribute-form";
import { createAttributeAction } from "../actions";

export const instant = false;

export default function NewAttributePage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouvel attribut" backHref="/admin/attributes" backLabel="Attributs" />
      <AttributeForm action={createAttributeAction} submitLabel="Créer l'attribut" />
    </div>
  );
}
