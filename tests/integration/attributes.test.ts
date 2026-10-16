import argon2 from "argon2";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = { adminId: null as string | null };

vi.mock("@/lib/auth", () => ({
  auth: async () => (session.adminId ? { user: { id: session.adminId } } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { createAttribute, deleteAttribute } = await import("@/data/attributes");

describe("attributes data access layer (electro212_test)", () => {
  let catalogManagerId: string;
  const createdAttributeIds: string[] = [];

  beforeAll(async () => {
    const passwordHash = await argon2.hash("test-password");
    const admin = await prisma.adminUser.create({
      data: {
        email: `catalog-manager-attrs-${Date.now()}@test.local`,
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
    await prisma.attribute.deleteMany({ where: { id: { in: createdAttributeIds } } });
    await prisma.adminUser.delete({ where: { id: catalogManagerId } });
    await prisma.$disconnect();
  });

  it("rejects an ENUM attribute with no options", async () => {
    await expect(
      createAttribute({
        code: `couleur_${Date.now()}`,
        label: "Couleur",
        dataType: "ENUM",
        enumOptions: [],
        isFilterable: true,
      }),
    ).rejects.toThrow();
  });

  it("creates a NUMBER attribute and stores a null enumOptions", async () => {
    const attribute = await createAttribute({
      code: `capacite_kg_${Date.now()}`,
      label: "Capacité",
      dataType: "NUMBER",
      unit: "kg",
      isFilterable: true,
    });
    createdAttributeIds.push(attribute.id);
    expect(attribute.enumOptions).toBeNull();
  });

  it("blocks hard delete while referenced by a CategoryAttribute, allows it once unreferenced", async () => {
    const attribute = await createAttribute({
      code: `btu_${Date.now()}`,
      label: "BTU",
      dataType: "NUMBER",
      isFilterable: true,
    });
    createdAttributeIds.push(attribute.id);

    const category = await prisma.category.create({
      data: {
        slug: `clim-${Date.now()}`,
        translations: { create: { locale: "fr", name: "Climatiseurs" } },
        categoryAttributes: { create: { attributeId: attribute.id } },
      },
    });

    const blocked = await deleteAttribute(attribute.id);
    expect(blocked).toMatchObject({ error: expect.stringContaining("catégorie") });

    await prisma.category.delete({ where: { id: category.id } });

    const allowed = await deleteAttribute(attribute.id);
    expect(allowed).toEqual({ ok: true });
    createdAttributeIds.splice(createdAttributeIds.indexOf(attribute.id), 1);
  });
});
