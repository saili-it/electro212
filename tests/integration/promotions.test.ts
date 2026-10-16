import argon2 from "argon2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ProductStatus } from "@prisma/client";

const session = { adminId: null as string | null };

vi.mock("@/lib/auth", () => ({
  auth: async () => (session.adminId ? { user: { id: session.adminId } } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { createPromotion, getPromotion, addPromotionProduct, removePromotionProduct, movePromotionProduct, listPromotions } =
  await import("@/data/promotions");

describe("promotions data access layer (electro212_test)", () => {
  let managerId: string;
  let categoryId: string;
  const productIds: string[] = [];
  const promotionIds: string[] = [];
  let publishedA = "";
  let publishedB = "";
  let draft = "";

  beforeAll(async () => {
    const admin = await prisma.adminUser.create({
      data: {
        email: `promo-mgr-${Date.now()}@test.local`,
        passwordHash: await argon2.hash("test-password"),
        name: "Promo Manager",
        role: "CATALOG_MANAGER",
        isActive: true,
      },
    });
    managerId = admin.id;
    session.adminId = managerId;

    const category = await prisma.category.create({
      data: { slug: `promo-cat-${Date.now()}`, translations: { create: { locale: "fr", name: "Cat promo" } } },
    });
    categoryId = category.id;

    const make = async (name: string, status: ProductStatus) => {
      const suffix = `${name}-${Date.now()}`;
      const product = await prisma.product.create({
        data: {
          sku: `PR-${suffix}`,
          slug: `pr-${suffix}`.toLowerCase(),
          primaryCategoryId: categoryId,
          priceMinorUnits: 10000,
          status,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
          translations: { create: { locale: "fr", name } },
          inventory: { create: { stockQuantity: 5 } },
        },
      });
      productIds.push(product.id);
      return product.id;
    };

    publishedA = await make("Alpha", "PUBLISHED");
    publishedB = await make("Beta", "PUBLISHED");
    draft = await make("Draft", "DRAFT");
  });

  afterAll(async () => {
    await prisma.promotion.deleteMany({ where: { id: { in: promotionIds } } });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.delete({ where: { id: categoryId } });
    await prisma.adminUser.delete({ where: { id: managerId } });
    await prisma.$disconnect();
  });

  it("rejects mutations without a session", async () => {
    session.adminId = null;
    await expect(
      createPromotion({ title: "X", slug: `x-${Date.now()}`, startsAt: null, endsAt: null, position: 0 }, null),
    ).rejects.toMatchObject({ status: 401 });
    session.adminId = managerId;
  });

  it("creates a promotion, adds products in curated order, and ignores duplicates", async () => {
    const promo = await createPromotion(
      { title: "Black Friday", slug: `bf-${Date.now()}`, startsAt: null, endsAt: null, position: 0 },
      null,
    );
    promotionIds.push(promo.id);

    await addPromotionProduct(promo.id, publishedA);
    await addPromotionProduct(promo.id, publishedB);
    await addPromotionProduct(promo.id, draft);
    await addPromotionProduct(promo.id, publishedA); // duplicate → no-op

    const detail = await getPromotion(promo.id);
    expect(detail?.products.map((p) => p.productId)).toEqual([publishedA, publishedB, draft]);
    expect(detail?.products.find((p) => p.productId === draft)?.status).toBe("DRAFT");
  });

  it("reorders and removes products", async () => {
    const promo = await createPromotion(
      { title: "Soldes", slug: `soldes-${Date.now()}`, startsAt: null, endsAt: null, position: 1 },
      null,
    );
    promotionIds.push(promo.id);

    await addPromotionProduct(promo.id, publishedA);
    await addPromotionProduct(promo.id, publishedB);

    await movePromotionProduct(promo.id, publishedB, "up");
    let detail = await getPromotion(promo.id);
    expect(detail?.products.map((p) => p.productId)).toEqual([publishedB, publishedA]);

    await removePromotionProduct(promo.id, publishedB);
    detail = await getPromotion(promo.id);
    expect(detail?.products.map((p) => p.productId)).toEqual([publishedA]);
  });

  it("lists promotions with their product counts", async () => {
    const list = await listPromotions();
    const mine = list.filter((p) => promotionIds.includes(p.id));
    expect(mine.length).toBeGreaterThanOrEqual(2);
  });
});
