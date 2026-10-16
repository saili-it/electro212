import "server-only";
import { localStorageAdapter } from "./local";
import { createS3StorageAdapter } from "./s3";
import type { StorageAdapter } from "./types";

let adapter: StorageAdapter | null = null;

/**
 * STORAGE_DRIVER=s3    → S3-compatible bucket (needs every STORAGE_* variable).
 * STORAGE_DRIVER=local → disk under .data/uploads (dev, or a VPS with a persistent volume).
 * Unset: s3 when configured, else local in development — and a hard error in
 * production, so uploads never silently land on a disk that a redeploy wipes.
 */
export function getStorage(): StorageAdapter {
  if (adapter) return adapter;

  const env = process.env;
  const s3Configured = Boolean(
    env.STORAGE_ENDPOINT && env.STORAGE_BUCKET && env.STORAGE_ACCESS_KEY_ID && env.STORAGE_SECRET_ACCESS_KEY && env.STORAGE_PUBLIC_CDN_URL,
  );
  // `||`, not `??`: .env.example ships STORAGE_DRIVER="" which must mean "unset".
  const driver = env.STORAGE_DRIVER || (s3Configured ? "s3" : env.NODE_ENV === "production" ? undefined : "local");

  if (driver === "s3") {
    if (!s3Configured) throw new Error("STORAGE_DRIVER=s3 but some STORAGE_* variables are missing.");
    adapter = createS3StorageAdapter({
      endpoint: env.STORAGE_ENDPOINT!,
      region: env.STORAGE_REGION || "auto",
      bucket: env.STORAGE_BUCKET!,
      accessKeyId: env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY!,
      publicBaseUrl: env.STORAGE_PUBLIC_CDN_URL!,
    });
  } else if (driver === "local") {
    adapter = localStorageAdapter;
  } else {
    throw new Error(
      "Image storage is not configured: set the STORAGE_* variables (S3-compatible bucket), " +
        "or STORAGE_DRIVER=local if uploads live on a persistent disk.",
    );
  }
  return adapter;
}
