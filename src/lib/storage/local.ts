import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertValidKey, type StorageAdapter } from "./types";

// Outside public/: `next start` only serves files that existed at build time,
// so uploads are served by the /uploads route handler instead.
// LOCAL_UPLOAD_DIR lets tests use a throwaway folder instead of the dev uploads.
// Uploads are runtime data, not code: the turbopackIgnore hints stop the build
// from tracing (and bundling) the whole project because of these dynamic paths.
function uploadRoot() {
  return process.env.LOCAL_UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "uploads");
}

function filePath(key: string) {
  assertValidKey(key);
  return path.join(/*turbopackIgnore: true*/ uploadRoot(), ...key.split("/"));
}

export const localStorageAdapter: StorageAdapter = {
  async put(key, body) {
    const target = filePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
    return { url: `/uploads/${key}` };
  },
  async delete(key) {
    try {
      await unlink(filePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },
};

/** Returns null for invalid keys or missing files (never throws on user input). */
export async function readLocalUpload(key: string): Promise<Buffer | null> {
  try {
    return await readFile(filePath(key));
  } catch {
    return null;
  }
}
