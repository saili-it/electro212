import { LinkButton } from "@/components/admin/ui";

export const instant = false;

export default function AdminForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface px-4 text-slate-900 [color-scheme:light]">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-xl text-amber-600">!</div>
        <h1 className="text-lg font-semibold">Accès refusé</h1>
        <p className="mt-2 text-sm text-slate-500">
          Votre compte n&apos;a pas les droits nécessaires pour cette page. Contactez un administrateur si besoin.
        </p>
        <div className="mt-6">
          <LinkButton href="/admin" variant="secondary">Retour au tableau de bord</LinkButton>
        </div>
      </div>
    </div>
  );
}
