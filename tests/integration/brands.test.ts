import argon2 from "argon2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = { adminId: null as string | null };

vi.mock("@/lib/auth", () => ({
  auth: async () => (session.adminId ? { user: { id: session.adminId } } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { createBrand, listBrands, deleteBrand } = await import("@/data/brands");

describe("brands data access layer (electro212_test)", () => {
  let catalogManagerId: string;
  const createdBrandIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    const passwordHash = await argon2.hash("test-password");
    const admin = await prisma.adminUser.create({
      data: {
        email: `catalog-manager-brands-${Date.now()}@test.local`,
        passwordHash,
        name: "Catalog Manager",
        role: "CATALOG_MANAGER",
        isActive: true,
      },
    });
    catalogManagerId = admin.id;
    session.adminId = catalogManagerId;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    await prisma.brand.deleteMany({ where: { id: { in: createdBrandIds } } });
    await prisma.adminUser.delete({ where: { id: catalogManagerId } });
    await prisma.$disconnect();
  });

  it("rejects mutations without a session", async () => {
    session.adminId = null;
    await expect(
      createBrand({ name: "Samsung", slug: `samsung-${Date.now()}` }),
    ).rejects.toMatchObject({ status: 401 });
    session.adminId = catalogManagerId;
  });

  it("creates and lists a brand", async () => {
    const slug = `samsung-${Date.now()}`;
    const brand = await createBrand({ name: "Samsung", slug });
    createdBrandIds.push(brand.id);

    const { items } = await listBrands({ q: "Samsung" });
    expect(items.some((item) => item.id === brand.id)).toBe(true);
  });

  it("blocks permanent delete while a product references the brand, allows it once the product is gone", async () => {
    const brand = await createBrand({ name: `ToDelete-${Date.now()}`, slug: `to-delete-${Date.now()}` });
    createdBrandIds.push(brand.id);

    const category = await prisma.category.create({
      data: { slug: `cat-for-brand-${Date.now()}`, translations: { create: { locale: "fr", name: "Cat" } } },
    });

    const product = await prisma.product.create({
      data: {
        sku: `SKU-BR-${Date.now()}`,
        slug: `produit-brand-${Date.now()}`,
        brandId: brand.id,
        primaryCategoryId: category.id,
        priceMinorUnits: 10000,
        inventory: { create: { stockQuantity: 1 } },
      },
    });
    createdProductIds.push(product.id);

    const blocked = await deleteBrand(brand.id);
    expect(blocked).toMatchObject({ error: expect.stringContaining("produit") });

    await prisma.product.delete({ where: { id: product.id } });
    createdProductIds.splice(createdProductIds.indexOf(product.id), 1);
    await prisma.category.delete({ where: { id: category.id } });

    const allowed = await deleteBrand(brand.id);
    expect(allowed).toEqual({ ok: true });
    createdBrandIds.splice(createdBrandIds.indexOf(brand.id), 1);
  });
});
