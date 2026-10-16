import "server-only";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";

export async function getDashboardStats() {
  await requireAdmin();

  const [byStatus, categoryCount, brandCount, missingDescription, inventories] = await Promise.all([
    prisma.product.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.category.count({ where: { isActive: true } }),
    prisma.brand.count({ where: { isActive: true } }),
    prisma.product.count({
      where: {
        status: { not: "ARCHIVED" },
        translations: { none: { locale: "fr", description: { not: null } } },
      },
    }),
    prisma.inventory.findMany({
      where: { product: { status: { not: "ARCHIVED" } } },
      select: { stockQuantity: true, reservedQuantity: true, lowStockThreshold: true },
    }),
  ]);

  const countFor = (status: string) => byStatus.find((row) => row.status === status)?._count._all ?? 0;
  const lowStock = inventories.filter(
    (inv) => inv.stockQuantity - inv.reservedQuantity <= inv.lowStockThreshold,
  ).length;

  return {
    published: countFor("PUBLISHED"),
    draft: countFor("DRAFT"),
    archived: countFor("ARCHIVED"),
    categoryCount,
    brandCount,
    missingDescription,
    lowStock,
  };
}
