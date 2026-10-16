import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthzError, ValidationError } from "@/lib/errors";

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
} | null;

export const SAVED: FormState = { success: "Modifications enregistrées." };

/** Shared error handling for every resource's Server Actions. */
export function handleActionError(err: unknown): FormState {
  if (err instanceof AuthzError) {
    redirect(err.status === 401 ? "/admin/login" : "/admin/forbidden");
  }
  if (err instanceof ValidationError) {
    return { error: err.message, fieldErrors: err.field ? { [err.field]: err.message } : undefined };
  }
  if (err instanceof z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Formulaire invalide.", fieldErrors };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = Array.isArray(err.meta?.target) ? (err.meta.target as string[]).join(", ") : "";
    return { error: `Cette valeur est déjà utilisée${target ? ` (${target})` : ""}.` };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    return { error: "Élément introuvable — il a peut-être déjà été supprimé." };
  }

  console.error(err);
  return { error: "Une erreur est survenue." };
}
