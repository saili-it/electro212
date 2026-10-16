import { existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import argon2 from "argon2";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const session = { adminId: null as string | null };

vi.mock("@/lib/auth", () => ({
  auth: async () => (session.adminId ? { user: { id: session.adminId } } : null),
}));

const { prisma } = await import("@/lib/prisma");
const { createBanner, updateBanner, deleteBanner, listBanners, bannerStatus } = await import("@/data/banners");

const uploadDir = process.env.LOCAL_UPLOAD_DIR!;
const fileFor = (key: string) => path.join(uploadDir, ...key.split("/"));
const bannerFiles = () => (existsSync(path.join(uploadDir, "banners")) ? readdirSync(path.join(uploadDir, "banners")) : []);
const image = (color = { r: 239, g: 61, b: 57 }) =>
  sharp({ create: { width: 1200, height: 360, channels: 3, background: color } }).png().toBuffer();

const input = (overrides: Record<string, unknown> = {}) =>
  ({ title: "Super offre flash", linkUrl: "/categories/televiseurs", startsAt: null, endsAt: null, ...overrides }) as never;

describe("banners data access layer (electro212_test + temp upload dir)", () => {
  let managerId: string;
  let readOnlyId: string;
  const bannerIds: string[] = [];

  beforeAll(async () => {
    const passwordHash = await argon2.hash("test-password");
    const stamp = Date.now();
    managerId = (await prisma.adminUser.create({ data: { email: `ban-m-${stamp}@test.local`, passwordHash, name: "M", role: "CATALOG_MANAGER" } })).id;
    readOnlyId = (await prisma.adminUser.create({ data: { email: `ban-r-${stamp}@test.local`, passwordHash, name: "R", role: "READ_ONLY" } })).id;
    session.adminId = managerId;
  });

  afterAll(async () => {
    await prisma.banner.deleteMany({ where: { id: { in: bannerIds } } });
    await prisma.adminUser.deleteMany({ where: { id: { in: [managerId, readOnlyId] } } });
    await prisma.$disconnect();
    rmSync(uploadDir, { recursive: true, force: true });
  });

  it("stores the processed image and the row together", async () => {
    const banner = await createBanner("PROMO", input({ ctaLabel: "J'en profite" }), await image());
    bannerIds.push(banner.id);
    expect(banner.imageKey).toMatch(/^banners\/[0-9a-f-]{36}\.webp$/);
    expect(banner.imageUrl).toBe(`/uploads/${banner.imageKey}`);
    expect(banner).toMatchObject({ imageWidth: 1200, imageHeight: 360 });
    expect(existsSync(fileFor(banner.imageKey))).toBe(true);
  });

  it("rejects a dangerous link before touching storage", async () => {
    const before = bannerFiles().length;
    await expect(createBanner("PROMO", input({ linkUrl: "javascript:alert(1)" }), await image())).rejects.toThrow();
    expect(bannerFiles().length).toBe(before);
  });

  it("requires an image on creation", async () => {
    await expect(createBanner("PROMO", input(), null)).rejects.toMatchObject({ field: "image" });
  });

  it("rejects an end date before the start date", async () => {
    await expect(
      createBanner("PROMO", input({ startsAt: new Date("2026-10-10T10:00:00Z"), endsAt: new Date("2026-10-09T10:00:00Z") }), await image()),
    ).rejects.toThrow();
  });

  it("replacing the image deletes the old file; keeping it leaves it untouched", async () => {
    const banner = await createBanner("PROMO", input(), await image());
    bannerIds.push(banner.id);

    const kept = await updateBanner(banner.id, input({ title: "Renamed" }), null);
    expect(kept.imageKey).toBe(banner.imageKey);
    expect(existsSync(fileFor(banner.imageKey))).toBe(true);

    const replaced = await updateBanner(banner.id, input(), await image({ r: 26, g: 178, b: 93 }));
    expect(replaced.imageKey).not.toBe(banner.imageKey);
    expect(existsSync(fileFor(replaced.imageKey))).toBe(true);
    expect(existsSync(fileFor(banner.imageKey))).toBe(false);
  });

  it("deleting a banner removes its file", async () => {
    const banner = await createBanner("PROMO", input(), await image());
    await deleteBanner(banner.id);
    expect(await prisma.banner.count({ where: { id: banner.id } })).toBe(0);
    expect(existsSync(fileFor(banner.imageKey))).toBe(false);
  });

  it("creates a HERO slide and keeps placements separate in listings", async () => {
    const hero = await createBanner("HERO", input({ title: "Hero slide" }), await image({ r: 13, g: 6, b: 37 }));
    bannerIds.push(hero.id);
    expect(hero.placement).toBe("HERO");

    const heroes = await listBanners("HERO");
    const promos = await listBanners("PROMO");
    expect(heroes.some((b) => b.id === hero.id)).toBe(true);
    expect(promos.some((b) => b.id === hero.id)).toBe(false);
    expect(heroes.every((b) => b.placement === "HERO")).toBe(true);
  });

  it("rejects a HERO image below the hero minimum width even though it would pass as a promo", async () => {
    // 700×360 is fine for PROMO (min 600×150) but below HERO's min 1000×360.
    const narrow = await sharp({ create: { width: 700, height: 360, channels: 3, background: { r: 1, g: 1, b: 1 } } }).png().toBuffer();
    await expect(createBanner("HERO", input(), narrow)).rejects.toThrow(/trop petite/);
    await expect(createBanner("PROMO", input(), narrow)).resolves.toBeTruthy();
    // clean up the promo one we just created
    const promos = await listBanners("PROMO");
    const created = promos.find((b) => !bannerIds.includes(b.id));
    if (created) {
      await deleteBanner(created.id);
    }
  });

  it("forbids READ_ONLY admins", async () => {
    session.adminId = readOnlyId;
    await expect(createBanner("PROMO", input(), await image())).rejects.toMatchObject({ status: 403 });
    session.adminId = managerId;
  });

  it("computes the display status from active flag and dates", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const at = (iso: string) => new Date(iso);
    expect(bannerStatus({ isActive: false, startsAt: null, endsAt: null }, now)).toBe("inactive");
    expect(bannerStatus({ isActive: true, startsAt: null, endsAt: at("2026-10-10T11:59:00Z") }, now)).toBe("expired");
    expect(bannerStatus({ isActive: true, startsAt: at("2026-10-11T00:00:00Z"), endsAt: null }, now)).toBe("scheduled");
    expect(bannerStatus({ isActive: true, startsAt: at("2026-10-01T00:00:00Z"), endsAt: at("2026-10-31T00:00:00Z") }, now)).toBe("active");
  });
});
