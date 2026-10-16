import type { AdminRole, AdminUser } from "@prisma/client";

type AdminAccessCheck = Pick<AdminUser, "isActive" | "role"> | null;

/**
 * Pure authorization decision — no DB/session imports, so it's unit-testable
 * in isolation. An inactive admin is treated identically to "no admin" (401),
 * never a distinct "deactivated" state.
 */
export function evaluateAdminAccess(
  admin: AdminAccessCheck,
  allowedRoles?: AdminRole[],
): { ok: true } | { ok: false; status: 401 | 403; message: string } {
  if (!admin || !admin.isActive) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(admin.role)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }
  return { ok: true };
}
