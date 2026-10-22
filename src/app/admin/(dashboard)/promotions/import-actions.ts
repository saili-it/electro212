"use server";

import { revalidatePath } from "next/cache";
import {
  commitPromotionImport,
  previewPromotionImport,
  type PromotionImportPreview,
  type PromotionImportResult,
} from "@/data/promotion-io";
import { refreshStorefront } from "@/lib/cache-tags";
import { AuthzError } from "@/lib/errors";

const MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

function fatal(message: string): PromotionImportPreview {
  return { total: 0, addCount: 0, alreadyCount: 0, errorCount: 0, rows: [], fatalError: message };
}

async function readUpload(formData: FormData): Promise<{ promotionId: string; data: ArrayBuffer } | { error: string }> {
  const promotionId = String(formData.get("promotionId") ?? "");
  if (!promotionId) return { error: "Promotion inconnue." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (max 5 Mo)." };
  if (!/\.xlsx$/i.test(file.name)) return { error: "Format non supporté — fournissez un fichier .xlsx." };
  return { promotionId, data: await file.arrayBuffer() };
}

export async function previewPromotionImportAction(formData: FormData): Promise<PromotionImportPreview> {
  const read = await readUpload(formData);
  if ("error" in read) return fatal(read.error);
  try {
    return await previewPromotionImport(read.promotionId, read.data);
  } catch (err) {
    return fatal(err instanceof AuthzError ? err.message : "Erreur lors de la lecture du fichier.");
  }
}

export async function commitPromotionImportAction(formData: FormData): Promise<PromotionImportResult> {
  const read = await readUpload(formData);
  if ("error" in read) return { ...fatal(read.error), added: 0 };
  try {
    const result = await commitPromotionImport(read.promotionId, read.data);
    if (result.added > 0) {
      revalidatePath(`/admin/promotions/${read.promotionId}`);
      refreshStorefront();
    }
    return result;
  } catch (err) {
    return { ...fatal(err instanceof AuthzError ? err.message : "Erreur lors de l'import."), added: 0 };
  }
}
