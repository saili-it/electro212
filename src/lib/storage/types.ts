export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

/** Keys are always server-generated: "<folder>/<uuid>.<ext>". Anything else is refused. */
export const STORAGE_KEY_PATTERN = /^[a-z0-9-]+\/[0-9a-f-]{36}\.(webp|jpg|png)$/;

export function assertValidKey(key: string) {
  if (!STORAGE_KEY_PATTERN.test(key)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
}
