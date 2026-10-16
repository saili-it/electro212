"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAttribute,
  deactivateAttribute,
  deleteAttribute,
  reactivateAttribute,
  updateAttribute,
  type AttributeInput,
} from "@/data/attributes";
import { refreshStorefront } from "@/lib/cache-tags";
import { handleActionError, SAVED, type FormState } from "@/lib/form-errors";

function parseAttributeForm(formData: FormData): AttributeInput {
  const enumOptionsRaw = String(formData.get("enumOptions") ?? "");
  const enumOptions = enumOptionsRaw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    code: String(formData.get("code") ?? "").trim(),
    label: String(formData.get("label") ?? ""),
    dataType: String(formData.get("dataType") ?? "TEXT") as AttributeInput["dataType"],
    unit: (formData.get("unit") as string) || null,
    enumOptions,
    isFilterable: formData.get("isFilterable") === "on",
  };
}

export async function createAttributeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  let attributeId: string;
  try {
    const attribute = await createAttribute(parseAttributeForm(formData));
    attributeId = attribute.id;
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/attributes");
  refreshStorefront();
  redirect(`/admin/attributes/${attributeId}`);
}

export async function updateAttributeAction(
  id: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await updateAttribute(id, parseAttributeForm(formData));
  } catch (err) {
    return handleActionError(err);
  }
  revalidatePath("/admin/attributes");
  refreshStorefront();
  revalidatePath(`/admin/attributes/${id}`);
  return SAVED;
}

export async function deactivateAttributeAction(id: string): Promise<FormState> {
  await deactivateAttribute(id);
  revalidatePath("/admin/attributes");
  refreshStorefront();
  return null;
}

export async function reactivateAttributeAction(id: string): Promise<FormState> {
  await reactivateAttribute(id);
  revalidatePath("/admin/attributes");
  refreshStorefront();
  return null;
}

export async function deleteAttributeAction(id: string): Promise<FormState> {
  const result = await deleteAttribute(id);
  if ("error" in result) return result;
  revalidatePath("/admin/attributes");
  refreshStorefront();
  redirect("/admin/attributes");
}
