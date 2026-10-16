"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { changeOrderStatus, setOrderPaymentStatus } from "@/data/orders";
import { refreshStorefront } from "@/lib/cache-tags";
import { handleActionError, SAVED, type FormState } from "@/lib/form-errors";

export async function changeOrderStatusAction(id: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  const toStatus = String(formData.get("toStatus") ?? "") as OrderStatus;
  const reason = String(formData.get("reason") ?? "");

  let result: Awaited<ReturnType<typeof changeOrderStatus>>;
  try {
    result = await changeOrderStatus(id, toStatus, reason);
  } catch (err) {
    return handleActionError(err);
  }
  if ("error" in result) return { error: result.error };

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  // A status change moves stock between reserved/sold/free — refresh the storefront.
  refreshStorefront();
  return SAVED;
}

export async function setPaymentStatusAction(id: string, status: PaymentStatus): Promise<FormState> {
  let result: Awaited<ReturnType<typeof setOrderPaymentStatus>>;
  try {
    result = await setOrderPaymentStatus(id, status);
  } catch (err) {
    return handleActionError(err);
  }
  if ("error" in result) return { error: result.error };

  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return SAVED;
}
