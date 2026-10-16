import argon2 from "argon2";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { evaluateAdminAccess } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

describe("admin access against a real database (electro212_test)", () => {
  let passwordHash: string;
  let activeAdminId: string;
  let inactiveAdminId: string;

  beforeAll(async () => {
    passwordHash = await argon2.hash("test-password");

    const active = await prisma.adminUser.create({
      data: {
        email: `active-${Date.now()}@test.local`,
        passwordHash,
        name: "Active Admin",
        role: "SUPER_ADMIN",
        isActive: true,
      },
    });
    const inactive = await prisma.adminUser.create({
      data: {
        email: `inactive-${Date.now()}@test.local`,
        passwordHash,
        name: "Inactive Admin",
        role: "SUPER_ADMIN",
        isActive: false,
      },
    });
    activeAdminId = active.id;
    inactiveAdminId = inactive.id;
  });

  afterAll(async () => {
    await prisma.adminUser.deleteMany({
      where: { id: { in: [activeAdminId, inactiveAdminId] } },
    });
    await prisma.$disconnect();
  });

  it("grants access for an active admin row fetched fresh from the DB", async () => {
    const admin = await prisma.adminUser.findUnique({ where: { id: activeAdminId } });
    expect(evaluateAdminAccess(admin)).toEqual({ ok: true });
  });

  it("denies access (401) for a real inactive admin row, mirroring getCurrentAdmin's null short-circuit", async () => {
    const admin = await prisma.adminUser.findUnique({ where: { id: inactiveAdminId } });
    const effectiveAdmin = admin && admin.isActive ? admin : null;
    expect(evaluateAdminAccess(effectiveAdmin)).toEqual({
      ok: false,
      status: 401,
      message: "Unauthorized",
    });
  });

  it("denies access immediately after an active admin is deactivated mid-session", async () => {
    const admin = await prisma.adminUser.create({
      data: {
        email: `toggle-${Date.now()}@test.local`,
        passwordHash,
        name: "Toggle Admin",
        role: "ORDER_MANAGER",
        isActive: true,
      },
    });

    try {
      const before = await prisma.adminUser.findUnique({ where: { id: admin.id } });
      expect(evaluateAdminAccess(before)).toEqual({ ok: true });

      await prisma.adminUser.update({ where: { id: admin.id }, data: { isActive: false } });

      const after = await prisma.adminUser.findUnique({ where: { id: admin.id } });
      expect(evaluateAdminAccess(after)).toEqual({
        ok: false,
        status: 401,
        message: "Unauthorized",
      });
    } finally {
      await prisma.adminUser.delete({ where: { id: admin.id } });
    }
  });
});
