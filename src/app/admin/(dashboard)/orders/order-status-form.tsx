"use client";

import { useActionState, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS, isReasonRequired } from "@/lib/orders";
import type { FormState } from "@/lib/form-errors";
import { ActionForm } from "@/components/admin/action-form";
import { Alert, buttonVariants, inputClass, labelClass } from "@/components/admin/ui";

export function OrderStatusForm({
  action,
  allowed,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  allowed: OrderStatus[];
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const [toStatus, setToStatus] = useState<OrderStatus | "">(allowed[0] ?? "");

  if (allowed.length === 0) {
    return <p className="text-sm text-slate-500">Cette commande est dans un statut final — aucun changement possible.</p>;
  }

  const reasonRequired = toStatus ? isReasonRequired(toStatus as OrderStatus) : false;

  return (
    <ActionForm dispatch={dispatch} className="flex flex-col gap-3">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {state?.success && <Alert tone="success">{state.success}</Alert>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="toStatus" className={labelClass}>
          Nouveau statut
        </label>
        <select
          id="toStatus"
          name="toStatus"
          value={toStatus}
          onChange={(e) => setToStatus(e.target.value as OrderStatus)}
          className={inputClass}
        >
          {allowed.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className={labelClass}>
          Motif{" "}
          {reasonRequired ? (
            <span className="text-red-600">*</span>
          ) : (
            <span className="font-normal text-slate-400">(facultatif)</span>
          )}
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={2}
          required={reasonRequired}
          placeholder={reasonRequired ? "Obligatoire pour ce statut" : "Note interne ou information client"}
          className={inputClass}
        />
      </div>

      <button type="submit" disabled={pending} className={buttonVariants.primary}>
        {pending ? "Mise à jour…" : "Mettre à jour le statut"}
      </button>
    </ActionForm>
  );
}
