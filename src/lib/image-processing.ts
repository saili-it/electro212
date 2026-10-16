import { randomUUID } from "node:crypto";
import sharp, { type Metadata } from "sharp";
import { ValidationError } from "@/lib/errors";

// Detected from the file's bytes by sharp, never from its name or declared type.
// SVG is deliberately excluded: it can carry scripts.
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_INPUT_PIXELS = 40_000_000; // guards against decompression bombs

export type ImageRules = {
  maxBytes: number;
  minWidth: number;
  minHeight: number;
  /** Larger images are downscaled to this width. */
  maxWidth: number;
};

export type ProcessedImage = { buffer: Buffer; width: number; height: number; contentType: "image/webp"; ext: "webp" };

// Promo card (~10:3). Kept named BANNER_IMAGE_RULES for existing callers/tests.
export const BANNER_IMAGE_RULES: ImageRules = { maxBytes: 5 * 1024 * 1024, minWidth: 600, minHeight: 150, maxWidth: 1600 };
// Hero slide: wide, high-res (~16:7), shown large so it allows a bigger file and width.
export const HERO_IMAGE_RULES: ImageRules = { maxBytes: 6 * 1024 * 1024, minWidth: 1000, minHeight: 360, maxWidth: 2000 };
// Side insert (~5:2) beside the hero. (Placement currently unused.)
export const SIDE_IMAGE_RULES: ImageRules = { maxBytes: 4 * 1024 * 1024, minWidth: 500, minHeight: 180, maxWidth: 1000 };
// Mid-page advertising banner: wide strip (~4:1).
export const MIDDLE_IMAGE_RULES: ImageRules = { maxBytes: 5 * 1024 * 1024, minWidth: 1000, minHeight: 220, maxWidth: 2000 };
// Product photo: shown up to ~600px (≈1400 on a 2× display), so cap there; allow large source files.
export const PRODUCT_IMAGE_RULES: ImageRules = { maxBytes: 15 * 1024 * 1024, minWidth: 200, minHeight: 200, maxWidth: 1400 };

export const BANNER_PLACEMENT_RULES = {
  HERO: HERO_IMAGE_RULES,
  PROMO: BANNER_IMAGE_RULES,
  SIDE: SIDE_IMAGE_RULES,
  MIDDLE: MIDDLE_IMAGE_RULES,
} as const;

/**
 * Validates an upload and re-encodes it to WebP. Re-encoding also drops EXIF
 * metadata (GPS position, camera details) after applying its rotation.
 */
export async function processUploadedImage(input: File | Buffer, rules: ImageRules, field = "image"): Promise<ProcessedImage> {
  const size = Buffer.isBuffer(input) ? input.byteLength : input.size;
  if (size === 0) throw new ValidationError("Le fichier image est vide.", field);
  if (size > rules.maxBytes) {
    throw new ValidationError(`Image trop lourde (max ${Math.round(rules.maxBytes / 1024 / 1024)} Mo).`, field);
  }

  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(await input.arrayBuffer());
  const decoder = () => sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });

  let metadata: Metadata;
  try {
    metadata = await decoder().metadata();
  } catch {
    throw new ValidationError("Fichier illisible : envoyez une image JPEG, PNG ou WebP.", field);
  }
  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new ValidationError("Format non accepté : JPEG, PNG ou WebP uniquement.", field);
  }

  // EXIF orientation 5–8 means the stored pixels are rotated 90°.
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = rotated ? metadata.height : metadata.width;
  const height = rotated ? metadata.width : metadata.height;
  if (!width || !height || width < rules.minWidth || height < rules.minHeight) {
    throw new ValidationError(
      `Image trop petite (${width ?? "?"}×${height ?? "?"} px) : minimum ${rules.minWidth}×${rules.minHeight} px.`,
      field,
    );
  }

  try {
    const { data, info } = await decoder()
      .rotate()
      .resize({ width: rules.maxWidth, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return { buffer: data, width: info.width, height: info.height, contentType: "image/webp", ext: "webp" };
  } catch {
    // Valid header but corrupt/truncated pixel data.
    throw new ValidationError("Image corrompue ou incomplète.", field);
  }
}

export function newStorageKey(folder: string, ext: string) {
  return `${folder}/${randomUUID()}.${ext}`;
}
