"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addPromotionProduct,
  createPromotion,
  deletePromotion,
  movePromotionProduct,
  removePromotionProduct,
  setPromotionActive,
  updatePromotion,
  type PromotionInput,
} from "@/data/promotions";
import { refreshStorefront } from "@/lib/cache-tags";
import { shopLocalToDate } from "@/lib/datetime";
import { ValidationError } from "@/lib/errors";
import { handleActionError, SAVED, type FormState } from "@/lib/form-errors";

function parseDate(formData: FormData, field: string): Date | null {
  const raw = String(formData.get(field) ?? "").trim();
  if (!raw) return null;
  const date = shopLocalToDate(raw);
  if (!date) throw new ValidationError("Date invalide.", field);
  return date;
}

function parsePromotionForm(formData: FormData): { input: PromotionInput; image: File | null } {
  const file = formData.get("image");
  const position = Number(formData.get("position") ?? 0);
  return {
    input: {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      subtitle: String(formData.get("subtitle") ?? "") || undefined,
      description: String(formData.get("description") ?? "") || undefined,
      startsAt: parseDate(formData, "startsAt"),
      endsAt: parseDate(formData, "endsAt"),
      position: Number.isFinite(position) ? Math.trunc(position) : 0,
    },
    image: file instanceof File && file.size > 0 ? file : null,
  };
}

function refresh(id?: string) {
  revalidatePath("/admin/promotions");
  if (id) revalidatePath(`/admin/promotions/${id}`);
  refreshStorefront();
}

export async function createPromotionAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  let id: string;
  try {
    const { input, image } = parsePromotionForm(formData);
    id = (await createPromotion(input, image)).id;
  } catch (err) {
    return handleActionError(err);
  }
  refresh();
  redirect(`/admin/promotions/${id}`);
}

export async function updatePromotionAction(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const { input, image } = parsePromotionForm(formData);
    await updatePromotion(id, input, image);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(id);
  return SAVED;
}

export async function setPromotionActiveAction(id: string, isActive: boolean): Promise<FormState> {
  try {
    await setPromotionActive(id, isActive);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(id);
  return null;
}

export async function deletePromotionAction(id: string): Promise<FormState> {
  try {
    await deletePromotion(id);
  } catch (err) {
    return handleActionError(err);
  }
  refresh();
  redirect("/admin/promotions");
}

export async function addPromotionProductAction(
  promotionId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { error: "Aucun produit sélectionné." };
  try {
    await addPromotionProduct(promotionId, productId);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(promotionId);
  return SAVED;
}

export async function removePromotionProductAction(promotionId: string, productId: string): Promise<FormState> {
  try {
    await removePromotionProduct(promotionId, productId);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(promotionId);
  return null;
}

export async function movePromotionProductAction(
  promotionId: string,
  productId: string,
  direction: "up" | "down",
): Promise<FormState> {
  try {
    await movePromotionProduct(promotionId, productId, direction);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(promotionId);
  return null;
}
