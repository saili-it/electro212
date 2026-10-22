"use server";

import { revalidatePath } from "next/cache";
import { commitImport, previewImport, type ImportPreview, type ImportResult } from "@/data/product-io";
import { refreshStorefront } from "@/lib/cache-tags";
import { AuthzError } from "@/lib/errors";

const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo

function emptyPreview(fatalError: string): ImportPreview {
  return { totalRows: 0, createCount: 0, updateCount: 0, errorCount: 0, rows: [], unknownColumns: [], fatalError };
}

async function readUpload(formData: FormData): Promise<{ data: ArrayBuffer; name: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Aucun fichier sélectionné." };
  if (file.size > MAX_BYTES) return { error: "Fichier trop volumineux (max 10 Mo)." };
  if (!/\.xlsx$/i.test(file.name)) return { error: "Format non supporté — fournissez un fichier .xlsx." };
  return { data: await file.arrayBuffer(), name: file.name };
}

export async function previewImportAction(_prev: ImportPreview | null, formData: FormData): Promise<ImportPreview> {
  const read = await readUpload(formData);
  if ("error" in read) return emptyPreview(read.error);
  try {
    return await previewImport(read.data);
  } catch (err) {
    return emptyPreview(err instanceof AuthzError ? err.message : "Erreur lors de la lecture du fichier.");
  }
}

export async function commitImportAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  const read = await readUpload(formData);
  if ("error" in read) return { ...emptyPreview(read.error), applied: 0, failed: 0, jobId: "" };
  try {
    const result = await commitImport(read.data, read.name);
    if (result.applied > 0) {
      revalidatePath("/admin/products");
      refreshStorefront();
    }
    return result;
  } catch (err) {
    return { ...emptyPreview(err instanceof AuthzError ? err.message : "Erreur lors de l'import."), applied: 0, failed: 0, jobId: "" };
  }
}
