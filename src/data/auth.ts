import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuthzError } from "@/lib/errors";
import { evaluateAdminAccess } from "@/lib/admin-access";
import type { AdminRole, AdminUser } from "@prisma/client";

/**
 * The actual enforcement point for every admin data access. Re-fetches the
 * AdminUser row fresh from Postgres on every call (memoized per-request via
 * React's cache()) rather than trusting the JWT's role claim, so a
 * deactivated or role-changed account is reflected immediately — regardless
 * of what src/proxy.ts or the JWT cookie still say.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const admin = await prisma.adminUser.findUnique({ where: { id: session.user.id } });
  if (!admin || !admin.isActive) return null;

  return admin;
});

/** For Server Actions and any other data-touching function. Throws, never redirects. */
export async function requireAdmin(allowedRoles?: AdminRole[]): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  const result = evaluateAdminAccess(admin, allowedRoles);
  if (!result.ok) {
    throw new AuthzError(result.status, result.message);
  }
  return admin as AdminUser;
}

/**
 * For Server Components (pages/layouts) only — redirects for a better UX.
 * This is a convenience, not the security boundary: every data-touching
 * function must still call requireAdmin()/getCurrentAdmin() itself.
 */
export async function requireAdminPage(allowedRoles?: AdminRole[]): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  const result = evaluateAdminAccess(admin, allowedRoles);
  if (!result.ok) {
    redirect(result.status === 401 ? "/admin/login" : "/admin/forbidden");
  }
  return admin as AdminUser;
}
