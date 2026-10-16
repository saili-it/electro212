import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";

const brandInputSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(160),
  logoUrl: z.string().url().nullable().optional(),
});

export type BrandInput = z.infer<typeof brandInputSchema>;
export type BrandMutationError = { error: string };

export async function listBrands(params: { q?: string; page?: number; pageSize?: number } = {}) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where = params.q ? { name: { contains: params.q, mode: "insensitive" as const } } : {};

  const [rows, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      orderBy: [{ name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { products: true } } },
    }),
    prisma.brand.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: row.isActive,
      productCount: row._count.products,
    })),
    total,
    page,
    pageSize,
  };
}

export async function listBrandOptions() {
  await requireAdmin();
  return prisma.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getBrand(id: string) {
  await requireAdmin();
  return prisma.brand.findUnique({ where: { id } });
}

export async function createBrand(input: BrandInput) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = brandInputSchema.parse(input);
  return prisma.brand.create({ data: { name: data.name, slug: data.slug, logoUrl: data.logoUrl || null } });
}

export async function updateBrand(id: string, input: BrandInput) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = brandInputSchema.parse(input);
  return prisma.brand.update({
    where: { id },
    data: { name: data.name, slug: data.slug, logoUrl: data.logoUrl || null },
  });
}

export async function deactivateBrand(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.brand.update({ where: { id }, data: { isActive: false } });
  return { ok: true as const };
}

export async function reactivateBrand(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.brand.update({ where: { id }, data: { isActive: true } });
  return { ok: true as const };
}

/** Brand.products (Product.brandId) has no onDelete — defaults RESTRICT. */
export async function deleteBrand(id: string): Promise<{ ok: true } | BrandMutationError> {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);

  const productCount = await prisma.product.count({ where: { brandId: id } });
  if (productCount > 0) {
    return { error: `${productCount} produit(s) référencent encore cette marque — impossible de supprimer.` };
  }

  await prisma.brand.delete({ where: { id } });
  return { ok: true };
}
