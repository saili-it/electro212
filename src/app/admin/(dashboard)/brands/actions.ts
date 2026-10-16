"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createBrand,
  deactivateBrand,
  deleteBrand,
  reactivateBrand,
  updateBrand,
  type BrandInput,
} from "@/data/brands";
import { refreshStorefront } from "@/lib/cache-tags";
import { handleActionError, SAVED, type FormState } from "@/lib/form-errors";

function parseBrandForm(formData: FormData): BrandInput {
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    logoUrl: (formData.get("logoUrl") as string) || null,
  };
}

export async function createBrandAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  let brandId: string;
  try {
    const brand = await createBrand(parseBrandForm(formData));
    brandId = brand.id;
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/brands");
  refreshStorefront();
  redirect(`/admin/brands/${brandId}`);
}

export async function updateBrandAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await updateBrand(id, parseBrandForm(formData));
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/brands");
  refreshStorefront();
  revalidatePath(`/admin/brands/${id}`);
  return SAVED;
}

export async function deactivateBrandAction(id: string): Promise<FormState> {
  await deactivateBrand(id);
  revalidatePath("/admin/brands");
  refreshStorefront();
  return null;
}

export async function reactivateBrandAction(id: string): Promise<FormState> {
  await reactivateBrand(id);
  revalidatePath("/admin/brands");
  refreshStorefront();
  return null;
}

export async function deleteBrandAction(id: string): Promise<FormState> {
  const result = await deleteBrand(id);
  if ("error" in result) return result;
  revalidatePath("/admin/brands");
  refreshStorefront();
  redirect("/admin/brands");
}
