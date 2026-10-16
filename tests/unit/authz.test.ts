import { describe, expect, it } from "vitest";
import { evaluateAdminAccess } from "@/lib/admin-access";

describe("evaluateAdminAccess", () => {
  it("denies with 401 when there is no admin", () => {
    const result = evaluateAdminAccess(null);
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("denies with 401 when the admin is inactive, same as no admin", () => {
    const result = evaluateAdminAccess({ isActive: false, role: "SUPER_ADMIN" });
    expect(result).toEqual({ ok: false, status: 401, message: "Unauthorized" });
  });

  it("denies with 403 when the admin is active but lacks an allowed role", () => {
    const result = evaluateAdminAccess({ isActive: true, role: "READ_ONLY" }, ["SUPER_ADMIN"]);
    expect(result).toEqual({ ok: false, status: 403, message: "Forbidden" });
  });

  it("allows an active admin with no role restriction", () => {
    const result = evaluateAdminAccess({ isActive: true, role: "READ_ONLY" });
    expect(result).toEqual({ ok: true });
  });

  it("allows an active admin whose role is in the allowed list", () => {
    const result = evaluateAdminAccess({ isActive: true, role: "CATALOG_MANAGER" }, [
      "SUPER_ADMIN",
      "CATALOG_MANAGER",
    ]);
    expect(result).toEqual({ ok: true });
  });
});
