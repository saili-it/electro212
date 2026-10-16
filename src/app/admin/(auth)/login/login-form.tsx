"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, buttonVariants, Field, inputClass } from "@/components/admin/ui";

/** Only allow same-site relative paths, so callbackUrl can't redirect off-site. */
function safeCallbackUrl(value: string | null) {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/admin";
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });
      if (result?.error) {
        setError("Email ou mot de passe incorrect.");
        setPending(false);
        return;
      }
      window.location.assign(callbackUrl);
    } catch {
      setError("Connexion impossible pour le moment. Réessayez.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <Alert>{error}</Alert>}

      <Field label="Email" htmlFor="email">
        <input id="email" name="email" type="email" required autoFocus autoComplete="username" className={inputClass} />
      </Field>

      <Field label="Mot de passe" htmlFor="password">
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${inputClass} pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-2 my-1 rounded-md px-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
      </Field>

      <button type="submit" disabled={pending} className={`${buttonVariants.primary} w-full`}>
        {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
