import { buttonVariants, Card, PageHeader } from "@/components/admin/ui";
import { ImportForm } from "./import-form";

export const instant = false;

export default function ProductImportPage() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Importer des produits (Excel)"
        description="Créez et mettez à jour vos fiches en masse à partir d'un fichier .xlsx."
        backHref="/admin/products"
        backLabel="Produits"
        actions={
          // File-download route handler, not a page — plain anchor forces the download.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/admin/products/export" className={buttonVariants.secondary}>
            Exporter le modèle
          </a>
        }
      />
      <Card>
        <ImportForm />
      </Card>
    </div>
  );
}
