import { describe, expect, it } from "vitest";
import { imageAddressSchema } from "@/lib/image-address";

describe("imageAddressSchema", () => {
  it("accepts web links and files shipped with the site", () => {
    for (const value of ["https://cdn.example.com/logo.png", "http://example.com/a.webp", "/brands/lg.png", "/categories/encastrable.webp"]) {
      expect(imageAddressSchema.safeParse(value).success, value).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const value of ["", "lg.png", "brands/lg.png", "//evil.example.com/x.png", "javascript:alert(1)", "/brands/my logo.png"]) {
      expect(imageAddressSchema.safeParse(value).success, value).toBe(false);
    }
  });
});
