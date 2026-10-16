import argon2 from "argon2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AuthzError } from "@/lib/errors";

const session = { adminId: null as string | null };

vi.mock("@/lib/auth", () => ({
  auth: async () => (session.adminId ? { user: { id: session.adminId } } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { createCategory, listCategories, deactivateCategory, deleteCategory, updateCategory } = await import(
  "@/data/categories"
);

describe("categories data access layer (electro212_test)", () => {
  let catalogManagerId: string;
  const createdCategoryIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    const passwordHash = await argon2.hash("test-password");
    const admin = await prisma.adminUser.create({
      data: {
        email: `catalog-manager-${Date.now()}@test.local`,
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
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    await prisma.adminUser.delete({ where: { id: catalogManagerId } });
    await prisma.$disconnect();
  });

  it("rejects every mutation when there is no session", async () => {
    session.adminId = null;
    await expect(
      createCategory({ slug: `no-session-${Date.now()}`, nameFr: "Test" } as never),
    ).rejects.toMatchObject({ status: 401 } satisfies Partial<AuthzError>);
    session.adminId = catalogManagerId;
  });

  it("creates a category with its fr translation and lists it back", async () => {
    const slug = `electromenager-${Date.now()}`;
    const category = await createCategory({ slug, nameFr: "Électroménager" } as never);
    createdCategoryIds.push(category.id);

    const { items } = await listCategories({ q: "Électroménager" });
    expect(items.some((item) => item.id === category.id && item.slug === slug)).toBe(true);
  });

  it("blocks deactivation when the category has an active child", async () => {
    const parent = await createCategory({ slug: `parent-${Date.now()}`, nameFr: "Parent" } as never);
    createdCategoryIds.push(parent.id);
    const child = await createCategory({
      slug: `child-${Date.now()}`,
      nameFr: "Child",
      parentId: parent.id,
    } as never);
    createdCategoryIds.push(child.id);

    const result = await deactivateCategory(parent.id);
    expect(result).toMatchObject({ error: expect.stringContaining("sous-catégorie") });
  });

  it("refuses to move a category under its own sub-category (would create a loop)", async () => {
    const parent = await createCategory({ slug: `loop-parent-${Date.now()}`, nameFr: "Loop parent" } as never);
    createdCategoryIds.push(parent.id);
    const child = await createCategory({
      slug: `loop-child-${Date.now()}`,
      nameFr: "Loop child",
      parentId: parent.id,
    } as never);
    createdCategoryIds.push(child.id);

    await expect(
      updateCategory(parent.id, { slug: parent.slug, nameFr: "Loop parent", parentId: child.id } as never),
    ).rejects.toMatchObject({ name: "ValidationError", field: "parentId" });
    await expect(
      updateCategory(parent.id, { slug: parent.slug, nameFr: "Loop parent", parentId: parent.id } as never),
    ).rejects.toMatchObject({ name: "ValidationError" });

    const unchanged = await prisma.category.findUniqueOrThrow({ where: { id: parent.id } });
    expect(unchanged.parentId).toBeNull();
  });

  it("lists sub-categories directly after their parent, with product totals rolled up", async () => {
    const parent = await createCategory({ slug: `tree-parent-${Date.now()}`, nameFr: "Tree parent" } as never);
    createdCategoryIds.push(parent.id);
    const child = await createCategory({
      slug: `tree-child-${Date.now()}`,
      nameFr: "Tree child",
      parentId: parent.id,
    } as never);
    createdCategoryIds.push(child.id);
    const product = await prisma.product.create({
      data: {
        sku: `SKU-TREE-${Date.now()}`,
        slug: `produit-tree-${Date.now()}`,
        primaryCategoryId: child.id,
        priceMinorUnits: 100,
        inventory: { create: {} },
      },
    });
    createdProductIds.push(product.id);

    const { items } = await listCategories();
    const parentIndex = items.findIndex((item) => item.id === parent.id);
    expect(items[parentIndex + 1]).toMatchObject({ id: child.id, depth: 1, parentName: "Tree parent" });
    expect(items[parentIndex]).toMatchObject({ productCount: 0, totalProductCount: 1, childCount: 1 });
  });

  it("blocks permanent delete when a product references the category as its primary category, and allows it once that product is gone", async () => {
    const category = await createCategory({
      slug: `to-delete-${Date.now()}`,
      nameFr: "À supprimer",
    } as never);
    createdCategoryIds.push(category.id);

    const product = await prisma.product.create({
      data: {
        sku: `SKU-${Date.now()}`,
        slug: `produit-${Date.now()}`,
        primaryCategoryId: category.id,
        priceMinorUnits: 10000,
        inventory: { create: { stockQuantity: 5 } },
      },
    });
    createdProductIds.push(product.id);

    const blocked = await deleteCategory(category.id);
    expect(blocked).toMatchObject({ error: expect.stringContaining("produit") });

    await prisma.product.delete({ where: { id: product.id } });
    createdProductIds.splice(createdProductIds.indexOf(product.id), 1);

    const allowed = await deleteCategory(category.id);
    expect(allowed).toEqual({ ok: true });
    createdCategoryIds.splice(createdCategoryIds.indexOf(category.id), 1);
  });
});
