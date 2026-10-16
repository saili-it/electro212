import argon2 from "argon2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = { adminId: null as string | null };

vi.mock("@/lib/auth", () => ({
  auth: async () => (session.adminId ? { user: { id: session.adminId } } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { createProduct, updateProduct, archiveProduct, listProducts } = await import("@/data/products");

const stamp = Date.now();

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    sku: `SKU-P-${stamp}-${Math.random().toString(36).slice(2, 7)}`,
    slug: `produit-${stamp}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: null,
    primaryCategoryId: "",
    secondaryCategoryIds: [],
    priceMinorUnits: 499900,
    compareAtPriceMinorUnits: null,
    stockQuantity: 4,
    fr: { name: "Machine à laver 9 kg" },
    ...overrides,
  } as never;
}

describe("products data access layer (electro212_test)", () => {
  let adminId: string;
  let readOnlyId: string;
  let categoryId: string;
  let otherCategoryId: string;
  let capaciteId: string;
  let typeId: string;
  const productIds: string[] = [];

  beforeAll(async () => {
    const passwordHash = await argon2.hash("test-password");
    adminId = (
      await prisma.adminUser.create({
        data: { email: `prod-admin-${stamp}@test.local`, passwordHash, name: "Cat", role: "CATALOG_MANAGER" },
      })
    ).id;
    readOnlyId = (
      await prisma.adminUser.create({
        data: { email: `prod-ro-${stamp}@test.local`, passwordHash, name: "RO", role: "READ_ONLY" },
      })
    ).id;

    capaciteId = (
      await prisma.attribute.create({ data: { code: `capacite_kg_${stamp}`, label: "Capacité", dataType: "NUMBER", unit: "kg" } })
    ).id;
    typeId = (
      await prisma.attribute.create({
        data: { code: `type_lavage_${stamp}`, label: "Type", dataType: "ENUM", enumOptions: ["Frontale", "Top load"] },
      })
    ).id;

    categoryId = (
      await prisma.category.create({
        data: {
          slug: `lave-linge-${stamp}`,
          translations: { create: { locale: "fr", name: "Machines à laver" } },
          categoryAttributes: {
            create: [
              { attributeId: capaciteId, isRequired: true },
              { attributeId: typeId },
            ],
          },
        },
      })
    ).id;
    otherCategoryId = (
      await prisma.category.create({
        data: { slug: `promo-${stamp}`, translations: { create: { locale: "fr", name: "Promo" } } },
      })
    ).id;

    session.adminId = adminId;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.category.deleteMany({ where: { id: { in: [categoryId, otherCategoryId] } } });
    await prisma.attribute.deleteMany({ where: { id: { in: [capaciteId, typeId] } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: [adminId, readOnlyId] } } });
    await prisma.$disconnect();
  });

  it("creates product, fr translation, inventory and typed attribute values together, as DRAFT", async () => {
    const result = await createProduct(baseInput({ primaryCategoryId: categoryId }), {
      [`attr_${capaciteId}`]: "9.5",
      [`attr_${typeId}`]: "Frontale",
    });
    expect(result).toMatchObject({ ok: true });
    if ("error" in result) throw new Error(result.error);
    productIds.push(result.id);

    const product = await prisma.product.findUniqueOrThrow({
      where: { id: result.id },
      include: { inventory: true, translations: true, attributeValues: true },
    });
    expect(product.status).toBe("DRAFT");
    expect(product.inventory?.stockQuantity).toBe(4);
    expect(product.inventory?.reservedQuantity).toBe(0);
    expect(product.translations.find((t) => t.locale === "fr")?.name).toBe("Machine à laver 9 kg");
    const capacite = product.attributeValues.find((v) => v.attributeId === capaciteId);
    expect(capacite?.valueNumber?.toString()).toBe("9.5");
  });

  it("rejects a missing required attribute without creating anything", async () => {
    const sku = `SKU-REQ-${stamp}`;
    const result = await createProduct(baseInput({ sku, primaryCategoryId: categoryId }), {});
    expect(result).toMatchObject({ error: expect.stringContaining("requis") });
    expect(await prisma.product.count({ where: { sku } })).toBe(0);
  });

  it("rejects an ENUM value outside the attribute's allowed options", async () => {
    const result = await createProduct(baseInput({ primaryCategoryId: categoryId }), {
      [`attr_${capaciteId}`]: "8",
      [`attr_${typeId}`]: "Valeur inventée",
    });
    expect(result).toMatchObject({ error: expect.stringContaining("invalide") });
  });

  it("ignores attribute ids that don't belong to the product's category", async () => {
    const result = await createProduct(baseInput({ primaryCategoryId: otherCategoryId }), {
      [`attr_${capaciteId}`]: "7",
    });
    if ("error" in result) throw new Error(result.error);
    productIds.push(result.id);
    expect(await prisma.productAttributeValue.count({ where: { productId: result.id } })).toBe(0);
  });

  it("rejects a compare-at price that isn't higher than the price", async () => {
    await expect(
      createProduct(
        baseInput({ primaryCategoryId: otherCategoryId, priceMinorUnits: 10000, compareAtPriceMinorUnits: 9000 }),
        {},
      ),
    ).rejects.toThrow();
  });

  it("rejects a secondary category equal to the primary category", async () => {
    await expect(
      createProduct(baseInput({ primaryCategoryId: otherCategoryId, secondaryCategoryIds: [otherCategoryId] }), {}),
    ).rejects.toThrow();
  });

  it("rejects negative stock", async () => {
    await expect(createProduct(baseInput({ primaryCategoryId: otherCategoryId, stockQuantity: -1 }), {})).rejects.toThrow();
  });

  it("updating a product leaves reservedQuantity untouched", async () => {
    const created = await createProduct(baseInput({ primaryCategoryId: otherCategoryId }), {});
    if ("error" in created) throw new Error(created.error);
    productIds.push(created.id);
    await prisma.inventory.update({ where: { productId: created.id }, data: { reservedQuantity: 2 } });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: created.id } });
    await updateProduct(
      created.id,
      baseInput({ sku: product.sku, slug: product.slug, primaryCategoryId: otherCategoryId, stockQuantity: 10 }),
      {},
    );

    const inventory = await prisma.inventory.findUniqueOrThrow({ where: { productId: created.id } });
    expect(inventory.stockQuantity).toBe(10);
    expect(inventory.reservedQuantity).toBe(2);
  });

  it("archives instead of deleting, and filters by status", async () => {
    const created = await createProduct(baseInput({ primaryCategoryId: otherCategoryId }), {});
    if ("error" in created) throw new Error(created.error);
    productIds.push(created.id);

    await archiveProduct(created.id);
    const { items } = await listProducts({ status: "ARCHIVED", categoryId: otherCategoryId });
    expect(items.some((item) => item.id === created.id)).toBe(true);
    expect(await prisma.product.count({ where: { id: created.id } })).toBe(1);
  });

  it("filtering by a main category includes products of its sub-categories", async () => {
    const main = await prisma.category.create({
      data: { slug: `main-${stamp}`, translations: { create: { locale: "fr", name: "Main" } } },
    });
    const sub = await prisma.category.create({
      data: { slug: `sub-${stamp}`, parentId: main.id, translations: { create: { locale: "fr", name: "Sub" } } },
    });
    const created = await createProduct(baseInput({ primaryCategoryId: sub.id }), {});
    if ("error" in created) throw new Error(created.error);

    try {
      const { items } = await listProducts({ categoryId: main.id });
      expect(items.map((item) => item.id)).toContain(created.id);
    } finally {
      await prisma.product.delete({ where: { id: created.id } });
      await prisma.category.delete({ where: { id: sub.id } });
      await prisma.category.delete({ where: { id: main.id } });
    }
  });

  it("forbids a READ_ONLY admin from creating products", async () => {
    session.adminId = readOnlyId;
    await expect(createProduct(baseInput({ primaryCategoryId: otherCategoryId }), {})).rejects.toMatchObject({ status: 403 });
    session.adminId = adminId;
  });
});
