import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { assertValidKey, type StorageAdapter } from "./types";

export type S3Config = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
};

/** Works with AWS S3 and S3-compatible providers (Cloudflare R2, Backblaze B2, MinIO…). */
export function createS3StorageAdapter(config: S3Config): StorageAdapter {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  const baseUrl = config.publicBaseUrl.replace(/\/+$/, "");

  return {
    async put(key, body, contentType) {
      assertValidKey(key);
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Keys are unique per upload, so the file never changes.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return { url: `${baseUrl}/${key}` };
    },
    async delete(key) {
      assertValidKey(key);
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
