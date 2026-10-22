"use server";

import { revalidatePath } from "next/cache";
import {
  addProductImages,
  deleteProductImage,
  reorderProductImages,
  updateProductImageAlt,
  type AddImagesResult,
} from "@/data/product-images";
import { refreshStorefront } from "@/lib/cache-tags";

function refresh(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  refreshStorefront();
}

export async function uploadProductImagesAction(productId: string, formData: FormData): Promise<AddImagesResult> {
  const files = formData.getAll("images").filter((f): f is File => f instanceof File);
  const result = await addProductImages(productId, files);
  if (result.added > 0) refresh(productId);
  return result;
}

export async function deleteProductImageAction(productId: string, imageId: string): Promise<{ ok: true } | { error: string }> {
  const result = await deleteProductImage(imageId);
  if ("ok" in result) refresh(productId);
  return result;
}

export async function reorderProductImagesAction(
  productId: string,
  orderedIds: string[],
): Promise<{ ok: true } | { error: string }> {
  const result = await reorderProductImages(productId, orderedIds);
  if ("ok" in result) refresh(productId);
  return result;
}

export async function updateProductImageAltAction(
  productId: string,
  imageId: string,
  alt: string,
): Promise<{ ok: true } | { error: string }> {
  const result = await updateProductImageAlt(imageId, alt);
  if ("ok" in result) refresh(productId);
  return result;
}
