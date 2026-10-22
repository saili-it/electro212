"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  archiveProduct,
  createProduct,
  deleteProduct,
  publishProduct,
  unpublishProduct,
  updateProduct,
  type ProductInput,
} from "@/data/products";
import { toMinorUnits } from "@/lib/money";
import { refreshStorefront } from "@/lib/cache-tags";
import { handleActionError, SAVED, type FormState } from "@/lib/form-errors";

function parseProductForm(formData: FormData): {
  input: ProductInput;
  rawAttributeValues: Record<string, string | undefined>;
} {
  const priceMajor = Number(formData.get("price") ?? 0);
  const compareAtMajor = formData.get("compareAtPrice");
  const secondaryCategoryIds = formData.getAll("secondaryCategoryIds").map(String).filter(Boolean);

  const rawAttributeValues: Record<string, string | undefined> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("attr_")) {
      rawAttributeValues[key] = typeof value === "string" ? value : undefined;
    }
  }

  return {
    input: {
      sku: String(formData.get("sku") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      brandId: (formData.get("brandId") as string) || null,
      primaryCategoryId: String(formData.get("primaryCategoryId") ?? ""),
      secondaryCategoryIds,
      priceMinorUnits: toMinorUnits(priceMajor),
      compareAtPriceMinorUnits:
        compareAtMajor && String(compareAtMajor).trim() !== "" ? toMinorUnits(Number(compareAtMajor)) : null,
      stockQuantity: Math.max(0, Math.trunc(Number(formData.get("stockQuantity") ?? 0))),
      fr: {
        name: String(formData.get("nameFr") ?? ""),
        description: (formData.get("descriptionFr") as string) || undefined,
        shortDescription: (formData.get("shortDescriptionFr") as string) || undefined,
        seoTitle: (formData.get("seoTitleFr") as string) || undefined,
        seoDescription: (formData.get("seoDescriptionFr") as string) || undefined,
      },
      ar: {
        name: (formData.get("nameAr") as string) || undefined,
        description: (formData.get("descriptionAr") as string) || undefined,
        shortDescription: (formData.get("shortDescriptionAr") as string) || undefined,
        seoTitle: (formData.get("seoTitleAr") as string) || undefined,
        seoDescription: (formData.get("seoDescriptionAr") as string) || undefined,
      },
    },
    rawAttributeValues,
  };
}

export async function createProductAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const { input, rawAttributeValues } = parseProductForm(formData);
  let productId: string;
  try {
    const result = await createProduct(input, rawAttributeValues);
    if ("error" in result) return { error: result.error };
    productId = result.id;
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/products");
  refreshStorefront();
  redirect(`/admin/products/${productId}`);
}

export async function updateProductAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { input, rawAttributeValues } = parseProductForm(formData);
  try {
    const result = await updateProduct(id, input, rawAttributeValues);
    if ("error" in result) return { error: result.error };
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/products");
  refreshStorefront();
  revalidatePath(`/admin/products/${id}`);
  return SAVED;
}

export async function publishProductAction(id: string): Promise<FormState> {
  await publishProduct(id);
  revalidatePath("/admin/products");
  refreshStorefront();
  revalidatePath(`/admin/products/${id}`);
  return null;
}

export async function unpublishProductAction(id: string): Promise<FormState> {
  await unpublishProduct(id);
  revalidatePath("/admin/products");
  refreshStorefront();
  revalidatePath(`/admin/products/${id}`);
  return null;
}

export async function archiveProductAction(id: string): Promise<FormState> {
  await archiveProduct(id);
  revalidatePath("/admin/products");
  refreshStorefront();
  revalidatePath(`/admin/products/${id}`);
  return null;
}

export async function deleteProductAction(id: string): Promise<FormState> {
  const result = await deleteProduct(id);
  if ("error" in result) return { error: result.error };
  revalidatePath("/admin/products");
  refreshStorefront();
  redirect("/admin/products");
}
