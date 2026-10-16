"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createCategory,
  deactivateCategory,
  deleteCategory,
  reactivateCategory,
  updateCategory,
  type CategoryInput,
} from "@/data/categories";
import { refreshStorefront } from "@/lib/cache-tags";
import { handleActionError, SAVED, type FormState } from "@/lib/form-errors";

function parseCategoryForm(formData: FormData): CategoryInput {
  const position = Number(formData.get("position") ?? 0);
  return {
    slug: String(formData.get("slug") ?? ""),
    parentId: (formData.get("parentId") as string) || null,
    position: Number.isFinite(position) ? position : 0,
    imageUrl: (formData.get("imageUrl") as string) || null,
    nameFr: String(formData.get("nameFr") ?? ""),
    nameAr: (formData.get("nameAr") as string) || undefined,
    seoTitleFr: (formData.get("seoTitleFr") as string) || undefined,
    seoDescriptionFr: (formData.get("seoDescriptionFr") as string) || undefined,
  };
}

export async function createCategoryAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  let categoryId: string;
  try {
    const category = await createCategory(parseCategoryForm(formData));
    categoryId = category.id;
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/categories");
  refreshStorefront();
  redirect(`/admin/categories/${categoryId}`);
}

export async function updateCategoryAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await updateCategory(id, parseCategoryForm(formData));
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/categories");
  refreshStorefront();
  revalidatePath(`/admin/categories/${id}`);
  return SAVED;
}

export async function deactivateCategoryAction(id: string): Promise<FormState> {
  const result = await deactivateCategory(id);
  if ("error" in result) return result;
  revalidatePath("/admin/categories");
  refreshStorefront();
  return null;
}

export async function reactivateCategoryAction(id: string): Promise<FormState> {
  await reactivateCategory(id);
  revalidatePath("/admin/categories");
  refreshStorefront();
  return null;
}

export async function deleteCategoryAction(id: string): Promise<FormState> {
  const result = await deleteCategory(id);
  if ("error" in result) return result;
  revalidatePath("/admin/categories");
  refreshStorefront();
  redirect("/admin/categories");
}
