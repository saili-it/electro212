"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BannerPlacement } from "@prisma/client";
import { createBanner, deleteBanner, setBannerActive, updateBanner, type BannerInput } from "@/data/banners";
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

function parseBannerForm(formData: FormData): { input: BannerInput; image: File | null } {
  const file = formData.get("image");
  const position = Number(formData.get("position") ?? 0);
  return {
    input: {
      title: String(formData.get("title") ?? ""),
      linkUrl: String(formData.get("linkUrl") ?? ""),
      ctaLabel: String(formData.get("ctaLabel") ?? "") || undefined,
      footnote: String(formData.get("footnote") ?? "") || undefined,
      headline: String(formData.get("headline") ?? "") || undefined,
      subtitle: String(formData.get("subtitle") ?? "") || undefined,
      startsAt: parseDate(formData, "startsAt"),
      endsAt: parseDate(formData, "endsAt"),
      position: Number.isFinite(position) ? Math.trunc(position) : 0,
    },
    // An empty file input still submits a 0-byte File.
    image: file instanceof File && file.size > 0 ? file : null,
  };
}

function refresh(id?: string) {
  revalidatePath("/admin/banners");
  if (id) revalidatePath(`/admin/banners/${id}`);
  refreshStorefront();
}

export async function createBannerAction(
  placement: BannerPlacement,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  let id: string;
  try {
    const { input, image } = parseBannerForm(formData);
    id = (await createBanner(placement, input, image)).id;
  } catch (err) {
    return handleActionError(err);
  }
  refresh();
  redirect(`/admin/banners/${id}`);
}

export async function updateBannerAction(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    const { input, image } = parseBannerForm(formData);
    await updateBanner(id, input, image);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(id);
  return SAVED;
}

export async function setBannerActiveAction(id: string, isActive: boolean): Promise<FormState> {
  try {
    await setBannerActive(id, isActive);
  } catch (err) {
    return handleActionError(err);
  }
  refresh(id);
  return null;
}

export async function deleteBannerAction(id: string): Promise<FormState> {
  try {
    await deleteBanner(id);
  } catch (err) {
    return handleActionError(err);
  }
  refresh();
  redirect("/admin/banners");
}
