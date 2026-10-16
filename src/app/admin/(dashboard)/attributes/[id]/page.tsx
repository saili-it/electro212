import { notFound } from "next/navigation";
import { getAttribute } from "@/data/attributes";
import { ActiveBadge, PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "../../_components/delete-button";
import { AttributeForm } from "../attribute-form";
import { deleteAttributeAction, updateAttributeAction } from "../actions";

export const instant = false;

function coerceEnumOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export default async function EditAttributePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attribute = await getAttribute(id);

  if (!attribute) {
    notFound();
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={attribute.label}
        backHref="/admin/attributes"
        backLabel="Attributs"
        actions={<ActiveBadge isActive={attribute.isActive} />}
      />
      <AttributeForm
        action={updateAttributeAction.bind(null, id)}
        submitLabel="Enregistrer"
        defaultValues={{
          code: attribute.code,
          label: attribute.label,
          dataType: attribute.dataType,
          unit: attribute.unit ?? "",
          enumOptions: coerceEnumOptions(attribute.enumOptions),
          isFilterable: attribute.isFilterable,
        }}
      />
      <div className="mt-8">
        <DeleteButton
          action={deleteAttributeAction.bind(null, id)}
          confirmMessage="Supprimer définitivement cet attribut ? Cette action est irréversible."
          description="Possible uniquement si aucun produit ni aucune catégorie ne l'utilise. Sinon, désactivez-le depuis la liste."
        />
      </div>
    </div>
  );
}
