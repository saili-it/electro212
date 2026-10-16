import { notFound } from "next/navigation";
import { bannerStatus, getBanner } from "@/data/banners";
import { dateToShopLocal } from "@/lib/datetime";
import { PageHeader } from "@/components/admin/ui";
import { DeleteButton } from "../../_components/delete-button";
import { BannerForm } from "../banner-form";
import { BannerStatusBadge } from "../status-badge";
import { deleteBannerAction, updateBannerAction } from "../actions";
import { getBannerLinkSuggestions } from "../link-suggestions";
import { PLACEMENTS, placementKeyOf } from "../placements";

export const instant = false;

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [banner, linkSuggestions] = await Promise.all([getBanner(id), getBannerLinkSuggestions()]);
  if (!banner) notFound();

  const placementKey = placementKeyOf(banner.placement);
  const config = PLACEMENTS[placementKey];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={banner.title}
        backHref={`/admin/banners?placement=${placementKey}`}
        backLabel={config.tab}
        actions={<BannerStatusBadge status={bannerStatus(banner)} />}
      />
      <BannerForm
        action={updateBannerAction.bind(null, id)}
        placementKey={placementKey}
        submitLabel="Enregistrer"
        linkSuggestions={linkSuggestions}
        defaultValues={{
          title: banner.title,
          linkUrl: banner.linkUrl,
          ctaLabel: banner.ctaLabel,
          footnote: banner.footnote ?? "",
          headline: banner.headline ?? "",
          subtitle: banner.subtitle ?? "",
          startsAt: banner.startsAt ? dateToShopLocal(banner.startsAt) : "",
          endsAt: banner.endsAt ? dateToShopLocal(banner.endsAt) : "",
          position: banner.position,
          imageUrl: banner.imageUrl,
        }}
      />
      <div className="mt-8">
        <DeleteButton
          action={deleteBannerAction.bind(null, id)}
          confirmMessage={`Supprimer définitivement cette ${config.singular} et son image ?`}
          description={`La ${config.singular} et son image seront supprimées. Pour la retirer temporairement, désactivez-la depuis la liste.`}
        />
      </div>
    </div>
  );
}
