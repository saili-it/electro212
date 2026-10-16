"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/form-errors";

const tones = {
  neutral: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  success: "border-brand-green/30 bg-brand-green-50 text-brand-green-700 hover:bg-brand-green/15",
  warning: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
  danger: "border-brand-red/30 bg-white text-brand-red-600 hover:bg-brand-red-50",
} as const;

export function ToggleActiveButton({
  action,
  label,
  tone = "neutral",
  confirmMessage,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  tone?: keyof typeof tones;
  confirmMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-end gap-1"
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={pending}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium shadow-sm transition disabled:opacity-50 ${tones[tone]}`}
      >
        {pending ? "…" : label}
      </button>
      {state?.error && <p className="max-w-xs text-right text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
