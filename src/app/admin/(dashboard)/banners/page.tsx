import Link from "next/link";
import { listBanners } from "@/data/banners";
import { formatShopDateTime } from "@/lib/datetime";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
import { ToggleActiveButton } from "../_components/toggle-active-button";
import { setBannerActiveAction } from "./actions";
import { BannerStatusBadge } from "./status-badge";
import { PLACEMENTS, parsePlacement, type PlacementKey } from "./placements";

export const instant = false;

function Tabs({ active }: { active: PlacementKey }) {
  const keys: PlacementKey[] = ["hero", "promo", "middle"];
  return (
    <div className="mb-6 inline-flex rounded-lg bg-slate-100 p-1">
      {keys.map((key) => (
        <Link
          key={key}
          href={`/admin/banners?placement=${key}`}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            key === active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {PLACEMENTS[key].tab}
        </Link>
      ))}
    </div>
  );
}

export default async function AdminBannersPage({ searchParams }: { searchParams: Promise<{ placement?: string }> }) {
  const { placement: placementParam } = await searchParams;
  const placementKey = parsePlacement(placementParam);
  const config = PLACEMENTS[placementKey];
  const banners = await listBanners(config.value);
  const live = banners.filter((b) => b.status === "active").length;
  const cardAspect =
    placementKey === "promo" ? "aspect-[10/3]" : placementKey === "middle" ? "aspect-[4/1]" : "aspect-[16/9]";
  const description =
    placementKey === "hero"
      ? "Le grand carrousel d'images en haut de la page d'accueil."
      : placementKey === "middle"
        ? "Bannière publicitaire large affichée au milieu de la page d'accueil."
        : "Les cartes promo affichées sous le carrousel, deux par ligne.";

  return (
    <div>
      <PageHeader
        title="Bannières"
        description={description}
        actions={<LinkButton href={`/admin/banners/new?placement=${placementKey}`}>+ {config.newLabel}</LinkButton>}
      />

      <Tabs active={placementKey} />

      {banners.length === 0 ? (
        <Card>
          <EmptyState
            title={`Aucune ${config.singular}`}
            description={`Ajoutez une image (${config.sizeHint.replace("Format conseillé : ", "").replace(/\. JPEG.*/, "")}), un lien et éventuellement des dates.`}
            action={<LinkButton href={`/admin/banners/new?placement=${placementKey}`}>Créer</LinkButton>}
          />
        </Card>
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-500">
            {live} en ligne sur {banners.length}
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {banners.map((banner) => (
              <li key={banner.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Link href={`/admin/banners/${banner.id}`} className="block bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded asset */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    width={banner.imageWidth}
                    height={banner.imageHeight}
                    className={`${cardAspect} w-full object-cover ${banner.status === "active" ? "" : "opacity-60 grayscale"}`}
                  />
                </Link>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/banners/${banner.id}`} className="font-semibold text-slate-900 hover:text-brand-red-600">
                        {banner.title}
                      </Link>
                      <p className="truncate font-mono text-xs text-slate-500">{banner.linkUrl}</p>
                    </div>
                    <BannerStatusBadge status={banner.status} />
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-slate-500">Début</dt>
                      <dd className="font-medium">{banner.startsAt ? formatShopDateTime(banner.startsAt) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Fin</dt>
                      <dd className="font-medium">{banner.endsAt ? formatShopDateTime(banner.endsAt) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Ordre</dt>
                      <dd className="font-medium">{banner.position}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto flex items-start justify-end gap-2">
                    <LinkButton href={`/admin/banners/${banner.id}`} variant="ghost">
                      Modifier
                    </LinkButton>
                    {banner.isActive ? (
                      <ToggleActiveButton action={setBannerActiveAction.bind(null, banner.id, false)} label="Désactiver" tone="danger" />
                    ) : (
                      <ToggleActiveButton action={setBannerActiveAction.bind(null, banner.id, true)} label="Activer" tone="success" />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
