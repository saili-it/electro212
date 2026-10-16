import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LOCALE } from "@/lib/i18n";
import { orderCategoryTree } from "@/lib/category-tree";
import { ValidationError } from "@/lib/errors";

const categoryInputSchema = z.object({
  slug: z.string().min(1).max(160),
  parentId: z.string().nullable().optional(),
  position: z.number().int().default(0),
  imageUrl: z.string().url().nullable().optional(),
  nameFr: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  seoTitleFr: z.string().max(200).optional(),
  seoDescriptionFr: z.string().max(500).optional(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export type CategoryListItem = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  depth: number;
  childCount: number;
  isActive: boolean;
  position: number;
  /** Products directly in this category (primary or secondary). */
  productCount: number;
  /** Same, including every sub-category below it. */
  totalProductCount: number;
};

/**
 * The whole tree, parent-then-children. Not paginated: a catalogue has
 * dozens of categories, and splitting a tree across pages hides structure.
 */
export async function listCategories(params: { q?: string } = {}) {
  await requireAdmin();

  const rows = await prisma.category.findMany({
    include: {
      translations: { where: { locale: DEFAULT_LOCALE } },
      _count: { select: { primaryProducts: true, productCategories: true } },
    },
  });

  const ordered = orderCategoryTree(
    rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      name: row.translations[0]?.name ?? row.slug,
      position: row.position,
      slug: row.slug,
      isActive: row.isActive,
      productCount: row._count.primaryProducts + row._count.productCategories,
    })),
  );

  const totals = new Map<string, number>();
  for (const category of [...ordered].reverse()) {
    const own = (totals.get(category.id) ?? 0) + category.productCount;
    totals.set(category.id, own);
    if (category.parentId) totals.set(category.parentId, (totals.get(category.parentId) ?? 0) + own);
  }

  let items: CategoryListItem[] = ordered.map((category) => ({
    ...category,
    totalProductCount: totals.get(category.id) ?? category.productCount,
  }));

  if (params.q) {
    const needle = params.q.toLocaleLowerCase("fr");
    items = items.filter((item) => item.name.toLocaleLowerCase("fr").includes(needle));
  }

  return { items, total: items.length };
}

/** Active categories in tree order, for parent/category pickers. */
export async function listCategoryOptions() {
  await requireAdmin();

  const rows = await prisma.category.findMany({
    where: { isActive: true },
    include: { translations: { where: { locale: DEFAULT_LOCALE } } },
  });

  return orderCategoryTree(
    rows.map((row) => ({
      id: row.id,
      parentId: row.parentId,
      name: row.translations[0]?.name ?? row.slug,
      position: row.position,
      slug: row.slug,
    })),
  ).map(({ id, name, depth, parentId, slug }) => ({ id, name, depth, parentId, slug }));
}

export async function getCategory(id: string) {
  await requireAdmin();

  return prisma.category.findUnique({
    where: { id },
    include: { translations: true },
  });
}

export async function createCategory(input: CategoryInput) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = categoryInputSchema.parse(input);

  return prisma.category.create({
    data: {
      slug: data.slug,
      parentId: data.parentId || null,
      position: data.position,
      imageUrl: data.imageUrl || null,
      translations: {
        create: [
          {
            locale: "fr",
            name: data.nameFr,
            seoTitle: data.seoTitleFr || null,
            seoDescription: data.seoDescriptionFr || null,
          },
          ...(data.nameAr ? [{ locale: "ar", name: data.nameAr }] : []),
        ],
      },
    },
  });
}

/** Walks up from the proposed parent; reaching `id` means the move would create a loop. */
async function assertNoCycle(id: string, parentId: string | null | undefined) {
  let cursor = parentId || null;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === id) {
      throw new ValidationError(
        "Une catégorie ne peut pas être placée sous elle-même ou sous l'une de ses sous-catégories.",
        "parentId",
      );
    }
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const parent = await prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
    cursor = parent?.parentId ?? null;
  }
}

export async function updateCategory(id: string, input: CategoryInput) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = categoryInputSchema.parse(input);
  await assertNoCycle(id, data.parentId);

  return prisma.$transaction(async (tx) => {
    const category = await tx.category.update({
      where: { id },
      data: {
        slug: data.slug,
        parentId: data.parentId || null,
        position: data.position,
        imageUrl: data.imageUrl || null,
      },
    });

    await tx.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: id, locale: "fr" } },
      create: {
        categoryId: id,
        locale: "fr",
        name: data.nameFr,
        seoTitle: data.seoTitleFr || null,
        seoDescription: data.seoDescriptionFr || null,
      },
      update: {
        name: data.nameFr,
        seoTitle: data.seoTitleFr || null,
        seoDescription: data.seoDescriptionFr || null,
      },
    });

    if (data.nameAr) {
      await tx.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: id, locale: "ar" } },
        create: { categoryId: id, locale: "ar", name: data.nameAr },
        update: { name: data.nameAr },
      });
    }

    return category;
  });
}

export type CategoryMutationError = { error: string };

/** Soft "delete" — blocks if the category has active children. */
export async function deactivateCategory(id: string): Promise<{ ok: true } | CategoryMutationError> {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);

  const activeChildren = await prisma.category.count({ where: { parentId: id, isActive: true } });
  if (activeChildren > 0) {
    return { error: `${activeChildren} sous-catégorie(s) active(s) — désactivez-les d'abord.` };
  }

  await prisma.category.update({ where: { id }, data: { isActive: false } });
  return { ok: true };
}

export async function reactivateCategory(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.category.update({ where: { id }, data: { isActive: true } });
  return { ok: true as const };
}

/**
 * True permanent delete. Category.primaryProducts (Product.primaryCategoryId)
 * has no onDelete (defaults RESTRICT); Category.productCategories (the
 * secondary-category join) cascades. Both must be checked — they have
 * different FK semantics and checking only one is incomplete.
 */
export async function deleteCategory(id: string): Promise<{ ok: true } | CategoryMutationError> {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);

  const [primaryCount, secondaryCount, childCount] = await Promise.all([
    prisma.product.count({ where: { primaryCategoryId: id } }),
    prisma.productCategory.count({ where: { categoryId: id } }),
    prisma.category.count({ where: { parentId: id } }),
  ]);

  if (primaryCount > 0 || secondaryCount > 0) {
    const total = primaryCount + secondaryCount;
    return { error: `${total} produit(s) référencent encore cette catégorie — impossible de supprimer.` };
  }
  if (childCount > 0) {
    return { error: `${childCount} sous-catégorie(s) existent encore — impossible de supprimer.` };
  }

  await prisma.category.delete({ where: { id } });
  return { ok: true };
}
