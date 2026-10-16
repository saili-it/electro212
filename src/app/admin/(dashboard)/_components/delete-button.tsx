"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-errors";
import { buttonVariants } from "@/components/admin/ui";

/** "Danger zone" block for irreversible deletes, with a confirm step and inline error. */
export function DeleteButton({
  action,
  confirmMessage,
  title = "Supprimer définitivement",
  description = "Possible uniquement si rien ne fait référence à cet élément. Préférez la désactivation sinon.",
  label = "Supprimer",
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  confirmMessage: string;
  title?: string;
  description?: string;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
      className="rounded-xl border border-red-200 bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-700">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
        <button type="submit" disabled={pending} className={buttonVariants.danger}>
          {pending ? "Suppression…" : label}
        </button>
      </div>
      {state?.error && <p className="mt-3 text-sm font-medium text-red-600">{state.error}</p>}
    </form>
  );
}
