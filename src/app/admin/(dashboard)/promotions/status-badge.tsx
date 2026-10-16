import { Badge } from "@/components/admin/ui";
import type { PromotionStatus } from "@/data/promotions";

const STATUS = {
  active: { label: "En ligne", tone: "green" },
  scheduled: { label: "Programmée", tone: "navy" },
  expired: { label: "Expirée", tone: "amber" },
  inactive: { label: "Désactivée", tone: "gray" },
} as const;

export function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
  return <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>;
}
