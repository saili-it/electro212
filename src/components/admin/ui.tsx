import Link from "next/link";
import type { ReactNode } from "react";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-red focus:outline-none focus:ring-2 focus:ring-brand-red/20 disabled:bg-slate-50";
export const labelClass = "text-sm font-medium text-slate-700";
export const hintClass = "text-xs text-slate-500";
export const errorTextClass = "text-xs font-medium text-red-600";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const buttonVariants = {
  primary: `${buttonBase} bg-brand-red-600 text-white shadow-sm hover:bg-brand-red-700 focus-visible:ring-brand-red`,
  secondary: `${buttonBase} border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:ring-slate-400`,
  danger: `${buttonBase} bg-red-600 text-white shadow-sm hover:bg-red-500 focus-visible:ring-red-500`,
  ghost: `${buttonBase} text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400`,
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <Link href={href} className={buttonVariants[variant]}>
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <span aria-hidden>←</span> {backLabel ?? "Retour"}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function Card({
  children,
  title,
  description,
  className = "",
  flush = false,
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

const badgeTones = {
  green: "bg-brand-green-50 text-brand-green-700 ring-brand-green/30",
  gray: "bg-slate-100 text-slate-600 ring-slate-500/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-brand-red-50 text-brand-red-700 ring-brand-red/25",
  navy: "bg-brand-navy/5 text-brand-navy ring-brand-navy/15",
} as const;

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? <Badge tone="green">Actif</Badge> : <Badge tone="gray">Inactif</Badge>;
}

const PRODUCT_STATUS = {
  DRAFT: { label: "Brouillon", tone: "amber" },
  PUBLISHED: { label: "Publié", tone: "green" },
  ARCHIVED: { label: "Archivé", tone: "gray" },
} as const;

export function ProductStatusBadge({ status }: { status: keyof typeof PRODUCT_STATUS }) {
  const config = PRODUCT_STATUS[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const ORDER_STATUS_TONES: Record<OrderStatus, keyof typeof badgeTones> = {
  PENDING_CONFIRMATION: "amber",
  CONFIRMED: "navy",
  PREPARING: "navy",
  OUT_FOR_DELIVERY: "navy",
  DELIVERED: "green",
  CANCELLED: "red",
  FAILED_DELIVERY: "red",
  RETURNED: "gray",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

const PAYMENT_STATUS_TONES: Record<PaymentStatus, keyof typeof badgeTones> = {
  NOT_APPLICABLE: "gray",
  PENDING: "amber",
  PAID: "green",
  FAILED: "red",
  REFUNDED: "gray",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS_TONES[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
        ∅
      </div>
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** A GET form, so filters live in the URL and survive reloads/sharing. */
export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <form className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
      {children}
      <button type="submit" className={buttonVariants.secondary}>
        Filtrer
      </button>
    </form>
  );
}

export function SearchInput({ defaultValue, placeholder }: { defaultValue?: string; placeholder: string }) {
  return (
    <div className="relative flex-1 sm:max-w-sm">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 1 0 3.47 9.77l3.13 3.13a.75.75 0 1 0 1.06-1.06l-3.13-3.13A5.5 5.5 0 0 0 9 3.5ZM5 9a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`${inputClass} pl-9`}
      />
    </div>
  );
}

export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export const thClass = "px-4 py-3 font-medium";
export const tdClass = "px-4 py-3 align-middle";
export const trClass = "transition-colors hover:bg-slate-50";

export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  params,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  const hrefFor = (p: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    search.set("page", String(p));
    return `${basePath}?${search}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <span>
        {total} résultat{total > 1 ? "s" : ""}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} className="rounded-md px-2.5 py-1 hover:bg-slate-100">
              Précédent
            </Link>
          ) : (
            <span className="px-2.5 py-1 text-slate-300">Précédent</span>
          )}
          <span className="px-2 font-medium text-slate-700">
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} className="rounded-md px-2.5 py-1 hover:bg-slate-100">
              Suivant
            </Link>
          ) : (
            <span className="px-2.5 py-1 text-slate-300">Suivant</span>
          )}
        </div>
      )}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint && !error && <p className={hintClass}>{hint}</p>}
      {error && <p className={errorTextClass}>{error}</p>}
    </div>
  );
}

export function FormFeedback({
  state,
}: {
  state: { error?: string; success?: string; fieldErrors?: Record<string, string> } | null;
}) {
  if (!state) return null;
  if (state.error) {
    const extra = state.fieldErrors ? Object.keys(state.fieldErrors).length : 0;
    return (
      <Alert tone="error">
        {state.error}
        {extra > 0 && " Corrigez les champs signalés ci-dessous."}
      </Alert>
    );
  }
  if (state.success) return <Alert tone="success">{state.success}</Alert>;
  return null;
}

/** Sticky footer so the save button stays reachable on long forms. */
export function FormActions({
  pending,
  submitLabel,
  cancelHref,
}: {
  pending: boolean;
  submitLabel: string;
  cancelHref?: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/90 px-1 py-3 backdrop-blur">
      {cancelHref && (
        <Link href={cancelHref} className={buttonVariants.ghost}>
          Annuler
        </Link>
      )}
      <button type="submit" disabled={pending} className={buttonVariants.primary}>
        {pending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
        )}
        {pending ? "Enregistrement…" : submitLabel}
      </button>
    </div>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-brand-green/30 bg-brand-green-50 text-brand-green-700";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}
