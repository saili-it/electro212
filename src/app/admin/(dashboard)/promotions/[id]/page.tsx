import Link from "next/link";
import { notFound } from "next/navigation";
import { getPromotion, getPromotionProductOptions } from "@/data/promotions";
import { dateToShopLocal } from "@/lib/datetime";
import { ActiveBadge, Badge, Card, PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "../../_components/delete-button";
import { ToggleActiveButton } from "../../_components/toggle-active-button";
import { PromotionForm } from "../promotion-form";
import { ProductPicker } from "../product-picker";
import { PromotionImport } from "../promotion-import";
import {
  addPromotionProductAction,
  deletePromotionAction,
  movePromotionProductAction,
  removePromotionProductAction,
  setPromotionActiveAction,
  updatePromotionAction,
} from "../actions";

export const instant = false;

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [promo, options] = await Promise.all([getPromotion(id), getPromotionProductOptions()]);
  if (!promo) notFound();

  const currentIds = new Set(promo.products.map((p) => p.productId));
  const available = options.filter((o) => !currentIds.has(o.id));

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={promo.title}
        description={`/promotions/${promo.slug}`}
        backHref="/admin/promotions"
        backLabel="Promotions"
        actions={
          <>
            <ActiveBadge isActive={promo.isActive} />
            <ToggleActiveButton
              action={setPromotionActiveAction.bind(null, promo.id, !promo.isActive)}
              label={promo.isActive ? "Désactiver" : "Activer"}
              tone={promo.isActive ? "warning" : "success"}
            />
          </>
        }
      />

      <PromotionForm
        action={updatePromotionAction.bind(null, id)}
        submitLabel="Enregistrer"
        defaultValues={{
          title: promo.title,
          slug: promo.slug,
          subtitle: promo.subtitle ?? "",
          description: promo.description ?? "",
          startsAt: promo.startsAt ? dateToShopLocal(promo.startsAt) : "",
          endsAt: promo.endsAt ? dateToShopLocal(promo.endsAt) : "",
          position: promo.position,
          heroImageUrl: promo.heroImageUrl,
        }}
      />

      <div className="mt-6">
        <Card title={`Produits de la promotion (${promo.products.length})`} description="Ordre d'affichage sur la page. Seuls les produits publiés sont visibles en boutique.">
          {promo.products.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun produit pour l&apos;instant — ajoutez-en ci-dessous.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {promo.products.map((item, index) => (
                <li key={item.productId} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-300">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- storage host isn't configured for next/image
                      <img src={item.imageUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      "—"
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link
                      href={`/admin/products/${item.productId}`}
                      className="block truncate text-sm font-medium text-slate-800 hover:text-brand-red-600"
                      title="Modifier le produit (prix, stock…)"
                    >
                      {item.name}
                    </Link>
                    <span className="font-mono text-xs text-slate-400">{item.sku}</span>
                  </span>
                  {item.status !== "PUBLISHED" && <Badge tone="amber">Non publié</Badge>}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {index > 0 && (
                      <ToggleActiveButton action={movePromotionProductAction.bind(null, promo.id, item.productId, "up")} label="▲" tone="neutral" />
                    )}
                    {index < promo.products.length - 1 && (
                      <ToggleActiveButton action={movePromotionProductAction.bind(null, promo.id, item.productId, "down")} label="▼" tone="neutral" />
                    )}
                    <ToggleActiveButton
                      action={removePromotionProductAction.bind(null, promo.id, item.productId)}
                      label="Retirer"
                      tone="danger"
                      confirmMessage="Retirer ce produit de la promotion ?"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Ajouter un produit</p>
            <ProductPicker addAction={addPromotionProductAction.bind(null, promo.id)} options={available} />
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <p className="mb-2 text-sm font-medium text-slate-700">Importer des produits (Excel)</p>
            <PromotionImport promotionId={promo.id} />
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <DeleteButton
          action={deletePromotionAction.bind(null, id)}
          confirmMessage="Supprimer définitivement cette promotion ? Les produits ne sont pas supprimés, seulement retirés de la promotion."
        />
      </div>
    </div>
  );
}
