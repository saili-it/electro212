import { Card, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";

export const instant = false;

export default function ProductImportPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Import CSV" backHref="/admin/products" backLabel="Produits" />
      <Card>
        <EmptyState
          title="Bientôt disponible"
          description="L'import de produits par fichier CSV (avec aperçu et validation avant enregistrement) arrive dans la prochaine étape."
          action={<LinkButton href="/admin/products/new" variant="secondary">Ajouter un produit manuellement</LinkButton>}
        />
      </Card>
    </div>
  );
}
