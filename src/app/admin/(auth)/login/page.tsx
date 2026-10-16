import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const instant = false;

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-surface text-slate-900 [color-scheme:light]">
      {/* Navy + red bands echo the storefront header. */}
      <div className="h-2 bg-brand-navy" aria-hidden />
      <div className="h-1 bg-brand-red" aria-hidden />

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <Image src="/brand/logo.png" alt="Electro212" width={628} height={444} priority className="mb-5 h-24 w-auto mix-blend-multiply" />
            <h1 className="text-xl font-semibold tracking-tight text-brand-navy">Espace administration</h1>
            <p className="mt-1 text-sm text-slate-500">Connectez-vous pour gérer le catalogue.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
