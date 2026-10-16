import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/data/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const attributeInputSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[a-z][a-z0-9_]*$/, "Lettres minuscules, chiffres et underscores uniquement"),
    label: z.string().min(1).max(160),
    dataType: z.enum(["TEXT", "NUMBER", "BOOLEAN", "ENUM"]),
    unit: z.string().max(20).nullable().optional(),
    enumOptions: z.array(z.string().min(1)).optional(),
    isFilterable: z.boolean().default(true),
  })
  .refine((data) => data.dataType !== "ENUM" || (data.enumOptions && data.enumOptions.length > 0), {
    message: "Au moins une option est requise pour un attribut de type liste",
    path: ["enumOptions"],
  });

export type AttributeInput = z.infer<typeof attributeInputSchema>;
export type AttributeMutationError = { error: string };

export async function listAttributes(params: { q?: string; page?: number; pageSize?: number } = {}) {
  await requireAdmin();

  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where = params.q
    ? {
        OR: [
          { code: { contains: params.q, mode: "insensitive" as const } },
          { label: { contains: params.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.attribute.findMany({
      where,
      orderBy: [{ code: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { values: true, categoryAttributes: true } } },
    }),
    prisma.attribute.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.code,
      label: row.label,
      dataType: row.dataType,
      isActive: row.isActive,
      usageCount: row._count.values + row._count.categoryAttributes,
    })),
    total,
    page,
    pageSize,
  };
}

export async function listAttributeOptions() {
  await requireAdmin();
  return prisma.attribute.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function getAttribute(id: string) {
  await requireAdmin();
  return prisma.attribute.findUnique({ where: { id } });
}

function normalizeEnumOptions(input: AttributeInput): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return input.dataType === "ENUM" ? (input.enumOptions ?? []) : Prisma.DbNull;
}

export async function createAttribute(input: AttributeInput) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = attributeInputSchema.parse(input);

  return prisma.attribute.create({
    data: {
      code: data.code,
      label: data.label,
      dataType: data.dataType,
      unit: data.unit || null,
      enumOptions: normalizeEnumOptions(data),
      isFilterable: data.isFilterable,
    },
  });
}

export async function updateAttribute(id: string, input: AttributeInput) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  const data = attributeInputSchema.parse(input);

  return prisma.attribute.update({
    where: { id },
    data: {
      code: data.code,
      label: data.label,
      dataType: data.dataType,
      unit: data.unit || null,
      enumOptions: normalizeEnumOptions(data),
      isFilterable: data.isFilterable,
    },
  });
}

export async function deactivateAttribute(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.attribute.update({ where: { id }, data: { isActive: false } });
  return { ok: true as const };
}

export async function reactivateAttribute(id: string) {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);
  await prisma.attribute.update({ where: { id }, data: { isActive: true } });
  return { ok: true as const };
}

/** Hard delete only when truly unused — zero ProductAttributeValue and zero CategoryAttribute rows. */
export async function deleteAttribute(id: string): Promise<{ ok: true } | AttributeMutationError> {
  await requireAdmin(["SUPER_ADMIN", "CATALOG_MANAGER"]);

  const [valueCount, categoryCount] = await Promise.all([
    prisma.productAttributeValue.count({ where: { attributeId: id } }),
    prisma.categoryAttribute.count({ where: { attributeId: id } }),
  ]);

  if (valueCount > 0 || categoryCount > 0) {
    return {
      error: `Utilisé par ${valueCount} produit(s) et ${categoryCount} catégorie(s) — désactivez-le au lieu de le supprimer.`,
    };
  }

  await prisma.attribute.delete({ where: { id } });
  return { ok: true };
}
