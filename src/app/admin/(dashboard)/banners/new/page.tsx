import { PageHeader } from "@/components/admin/ui";
import { BannerForm } from "../banner-form";
import { createBannerAction } from "../actions";
import { getBannerLinkSuggestions } from "../link-suggestions";
import { PLACEMENTS, parsePlacement } from "../placements";

export const instant = false;

export default async function NewBannerPage({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const { placement: placementParam } = await searchParams;
  const placementKey = parsePlacement(placementParam);
  const config = PLACEMENTS[placementKey];
  const linkSuggestions = await getBannerLinkSuggestions();

  return (
    <div className="max-w-3xl">
      <PageHeader title={config.newLabel} backHref={`/admin/banners?placement=${placementKey}`} backLabel={config.tab} />
      <BannerForm
        action={createBannerAction.bind(null, config.value)}
        placementKey={placementKey}
        submitLabel="Créer"
        linkSuggestions={linkSuggestions}
      />
    </div>
  );
}
