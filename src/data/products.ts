import "server-only";
import { Prisma, type AttributeDataType, type ProductStatus } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { orderCategoryTree } from "@/lib/category-tree";

const translationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  shortDescription: z.string().max(500).optional(),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(500).optional(),
});

const productInputSchema = z
  .object({
    sku: z.string().min(1).max(64),
    slug: z.string().min(1).max(200),
    brandId: z.string().nullable().optional(),
    primaryCategoryId: z.string().min(1),
    secondaryCategoryIds: z.array(z.string()).default([]),
    priceMinorUnits: z.number().int().nonnegative(),
    compareAtPriceMinorUnits: z.number().int().nonnegative().nullable().optional(),
    stockQuantity: z.number().int().nonnegative(),
    fr: translationSchema,
    ar: translationSchema.partial({ name: true }).optional(),
  })
  .refine(
    (data) =>
      !data.compareAtPriceMinorUnits || data.compareAtPriceMinorUnits > data.priceMinorUnits,
    { message: "Le prix barré doit être supérieur au prix", path: ["compareAtPriceMinorUnits"] },
  )
  .refine((data) => !data.secondaryCategoryIds.includes(data.primaryCategoryId), {
    message: "Une catégorie secondaire ne peut pas être identique à la catégorie principale",
    path: ["secondaryCategoryIds"],
  });

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductMutationError = { error: string; fieldErrors?: Record<string, string> };

export type AttributeValueInput = {
  attributeId: string;
  code: string;
  dataType: AttributeDataType;
  valueText?: string;
  valueNumber?: string;
  valueBoolean?: boolean;
};

/** The category plus every sub-category below it, so filtering a main category includes its children. */
async function withDescendantIds(categoryId: string): Promise<string[]> {
  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const result = [categoryId];
  for (let i = 0; i < result.length; i += 1) {
    for (const category of all) {
      if (category.parentId === result[i] && !result.includes(category.id)) result.push(category.id);
    }
  }
  return result;
}

export async function listProducts(
  params: {
    q?: string;
    status?: ProductStatus;
    categoryId?: string;
    brandId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const categoryIds = params.categoryId ? await withDescendantIds(params.categoryId) : null;

  const where: Prisma.ProductWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(categoryIds ? { primaryCategoryId: { in: categoryIds } } : {}),
    ...(params.brandId ? { brandId: params.brandId } : {}),
    ...(params.q
      ? {
          OR: [
            { sku: { contains: params.q, mode: "insensitive" } },
            { translations: { some: { name: { contains: params.q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        translations: { where: { locale: DEFAULT_LOCALE } },
        brand: { select: { name: true } },
        primaryCategory: { include: { translations: { where: { locale: DEFAULT_LOCALE } } } },
        inventory: true,
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      name: row.translations[0]?.name ?? row.slug,
      brandName: row.brand?.name ?? null,
      categoryName: row.primaryCategory.translations[0]?.name ?? row.primaryCategory.slug,
      status: row.status,
      priceMinorUnits: row.priceMinorUnits,
      availableStock: (row.inventory?.stockQuantity ?? 0) - (row.inventory?.reservedQuantity ?? 0),
    })),
    total,
    page,
    pageSize,
  };
}

export async function getProduct(id: string) {
  await requireAdmin();

  return prisma.product.findUnique({
    where: { id },
    include: {
      translations: true,
      categories: true,
      attributeValues: true,
      inventory: true,
      images: { orderBy: { position: "asc" } },
    },
  });
}

export async function getProductFormOptions() {
  await requireAdmin();

  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      include: {
        translations: { where: { locale: DEFAULT_LOCALE } },
        categoryAttributes: { include: { attribute: true }, orderBy: { position: "asc" } },
      },
    }),
    prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const ordered = orderCategoryTree(
    categories.map((category) => ({
      id: category.id,
      parentId: category.parentId,
      name: category.translations[0]?.name ?? category.slug,
      position: category.position,
      categoryAttributes: category.categoryAttributes,
    })),
  );

  return {
    categories: ordered.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      depth: category.depth,
      childCount: category.childCount,
      attributes: category.categoryAttributes
        .filter((ca) => ca.attribute.isActive)
        .map((ca) => ({
          id: ca.attribute.id,
          code: ca.attribute.code,
          label: ca.attribute.label,
          dataType: ca.attribute.dataType,
          unit: ca.attribute.unit,
          enumOptions: Array.isArray(ca.attribute.enumOptions)
            ? ca.attribute.enumOptions.filter((o): o is string => typeof o === "string")
            : [],
          isRequired: ca.isRequired,
        })),
    })),
    brands: brands.map((brand) => ({ id: brand.id, name: brand.name })),
  };
}

/**
 * Re-derives which attributes are actually valid for the submitted primary
 * category from the DB (never trusts client-supplied attribute ids), and
 * validates each submitted value against that attribute's real dataType.
 */
async function resolveAttributeValues(
  primaryCategoryId: string,
  rawValues: Record<string, string | undefined>,
): Promise<{ values: AttributeValueInput[]; error?: string }> {
  const categoryAttributes = await prisma.categoryAttribute.findMany({
    where: { categoryId: primaryCategoryId, attribute: { isActive: true } },
    include: { attribute: true },
  });

  const values: AttributeValueInput[] = [];

  for (const ca of categoryAttributes) {
    const raw = rawValues[`attr_${ca.attributeId}`];
    const hasValue = raw !== undefined && raw !== "";

    if (ca.isRequired && !hasValue) {
      return { values: [], error: `Le champ "${ca.attribute.label}" est requis.` };
    }
    if (!hasValue) continue;

    const entry: AttributeValueInput = {
      attributeId: ca.attributeId,
      code: ca.attribute.code,
      dataType: ca.attribute.dataType,
    };

    if (ca.attribute.dataType === "NUMBER") {
      if (Number.isNaN(Number(raw))) {
        return { values: [], error: `"${ca.attribute.label}" doit être un nombre.` };
      }
      entry.valueNumber = raw;
    } else if (ca.attribute.dataType === "BOOLEAN") {
      entry.valueBoolean = raw === "true" || raw === "on";
    } else if (ca.attribute.dataType === "ENUM") {
      const options = Array.isArray(ca.attribute.enumOptions) ? ca.attribute.enumOptions : [];
      if (!options.includes(raw)) {
        return { values: [], error: `Valeur invalide pour "${ca.attribute.label}".` };
      }
      entry.valueText = raw;
    } else {
      entry.valueText = raw;
    }

    values.push(entry);
  }

  return { values };
}

function attributeValuesToPrismaCreate(values: AttributeValueInput[]) {
  return values.map((value) => ({
    attributeId: value.attributeId,
    valueText: value.valueText ?? null,
    valueNumber: value.valueNumber !== undefined ? new Prisma.Decimal(value.valueNumber) : null,
    valueBoolean: value.valueBoolean ?? null,
  }));
}

export async function createProduct(input: ProductInput, rawAttributeValues: Record<string, string | undefined>) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = productInputSchema.parse(input);

  const resolved = await resolveAttributeValues(data.primaryCategoryId, rawAttributeValues);
  if (resolved.error) {
    return { error: resolved.error } satisfies ProductMutationError;
  }

  const product = await prisma.product.create({
    data: {
      sku: data.sku,
      slug: data.slug,
      brandId: data.brandId || null,
      primaryCategoryId: data.primaryCategoryId,
      priceMinorUnits: data.priceMinorUnits,
      compareAtPriceMinorUnits: data.compareAtPriceMinorUnits || null,
      status: "DRAFT",
      categories: {
        create: data.secondaryCategoryIds.map((categoryId) => ({ categoryId })),
      },
      translations: {
        create: [
          { locale: "fr", ...data.fr },
          ...(data.ar?.name ? [{ locale: "ar", ...data.ar, name: data.ar.name }] : []),
        ],
      },
      attributeValues: { create: attributeValuesToPrismaCreate(resolved.values) },
      // Product + Inventory created together in one nested write — never two
      // sequential statements — so a crash between them can't leave a
      // product with no Inventory row (availableStock assumes it always exists).
      inventory: { create: { stockQuantity: data.stockQuantity } },
    },
  });

  return { ok: true as const, id: product.id };
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  rawAttributeValues: Record<string, string | undefined>,
) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = productInputSchema.parse(input);

  const resolved = await resolveAttributeValues(data.primaryCategoryId, rawAttributeValues);
  if (resolved.error) {
    return { error: resolved.error } satisfies ProductMutationError;
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        sku: data.sku,
        slug: data.slug,
        brandId: data.brandId || null,
        primaryCategoryId: data.primaryCategoryId,
        priceMinorUnits: data.priceMinorUnits,
        compareAtPriceMinorUnits: data.compareAtPriceMinorUnits || null,
      },
    });

    await tx.productCategory.deleteMany({ where: { productId: id } });
    if (data.secondaryCategoryIds.length > 0) {
      await tx.productCategory.createMany({
        data: data.secondaryCategoryIds.map((categoryId) => ({ productId: id, categoryId })),
      });
    }

    await tx.productTranslation.upsert({
      where: { productId_locale: { productId: id, locale: "fr" } },
      create: { productId: id, locale: "fr", ...data.fr },
      update: data.fr,
    });
    if (data.ar?.name) {
      await tx.productTranslation.upsert({
        where: { productId_locale: { productId: id, locale: "ar" } },
        create: { productId: id, locale: "ar", ...data.ar, name: data.ar.name },
        update: { ...data.ar, name: data.ar.name },
      });
    }

    await tx.productAttributeValue.deleteMany({ where: { productId: id } });
    if (resolved.values.length > 0) {
      await tx.productAttributeValue.createMany({
        data: attributeValuesToPrismaCreate(resolved.values).map((value) => ({
          ...value,
          productId: id,
        })),
      });
    }

    await tx.inventory.update({ where: { productId: id }, data: { stockQuantity: data.stockQuantity } });
  });

  return { ok: true as const, id };
}

export async function publishProduct(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.product.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  return { ok: true as const };
}

export async function unpublishProduct(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.product.update({ where: { id }, data: { status: "DRAFT" } });
  return { ok: true as const };
}

/** Never a hard delete — archiving is the only "removal" exposed in the admin. */
export async function archiveProduct(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  return { ok: true as const };
}
