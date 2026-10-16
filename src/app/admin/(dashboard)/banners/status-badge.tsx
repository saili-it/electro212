import { Badge } from "@/components/admin/ui";
import type { BannerStatus } from "@/data/banners";

const STATUS = {
  active: { label: "En ligne", tone: "green" },
  scheduled: { label: "Programmée", tone: "navy" },
  expired: { label: "Expirée", tone: "amber" },
  inactive: { label: "Désactivée", tone: "gray" },
} as const;

export function BannerStatusBadge({ status }: { status: BannerStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
