import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { BANNER_IMAGE_RULES, processUploadedImage } from "@/lib/image-processing";
import { isAllowedLink } from "@/lib/links";

const solid = (width: number, height: number, format: "png" | "jpeg" | "webp" = "png") =>
  sharp({ create: { width, height, channels: 3, background: { r: 239, g: 61, b: 57 } } })[format]().toBuffer();

describe("processUploadedImage", () => {
  it("accepts a PNG and re-encodes it to WebP with its real dimensions", async () => {
    const result = await processUploadedImage(await solid(1200, 360), BANNER_IMAGE_RULES);
    expect(result).toMatchObject({ width: 1200, height: 360, contentType: "image/webp" });
    expect((await sharp(result.buffer).metadata()).format).toBe("webp");
  });

  it("downscales images wider than the limit", async () => {
    const result = await processUploadedImage(await solid(3200, 960, "jpeg"), BANNER_IMAGE_RULES);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(480);
  });

  it("rejects SVG even though sharp could read it (SVG can carry scripts)", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360"><script>alert(1)</script><rect width="1200" height="360"/></svg>',
    );
    await expect(processUploadedImage(svg, BANNER_IMAGE_RULES)).rejects.toMatchObject({ field: "image" });
  });

  it("rejects a non-image file renamed as an image", async () => {
    await expect(processUploadedImage(Buffer.from("not an image at all"), BANNER_IMAGE_RULES)).rejects.toThrow(/illisible/);
  });

  it("rejects images below the minimum size", async () => {
    await expect(processUploadedImage(await solid(300, 100), BANNER_IMAGE_RULES)).rejects.toThrow(/trop petite/);
  });

  it("rejects files over the byte limit before decoding them", async () => {
    await expect(processUploadedImage(Buffer.alloc(6 * 1024 * 1024, 1), BANNER_IMAGE_RULES)).rejects.toThrow(/trop lourde/);
  });

  it("rejects a truncated (corrupted) JPEG", async () => {
    const jpeg = await solid(1200, 360, "jpeg");
    await expect(processUploadedImage(jpeg.subarray(0, Math.floor(jpeg.length / 3)), BANNER_IMAGE_RULES)).rejects.toThrow();
  });
});

describe("isAllowedLink", () => {
  it.each(["/categories/televiseurs", "/", "/produits/x?ref=promo", "https://example.com/offre"])("allows %s", (link) => {
    expect(isAllowedLink(link)).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "//evil.example", "http://insecure.example", "categories/tv", "/\\evil.example"])(
    "refuses %s",
    (link) => {
      expect(isAllowedLink(link)).toBe(false);
    },
  );
});
