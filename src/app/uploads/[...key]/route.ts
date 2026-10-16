import { readLocalUpload } from "@/lib/storage/local";

const CONTENT_TYPES: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

/** Serves files written by the local storage adapter (dev, or a VPS with a persistent volume). */
export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const joined = key.join("/");
  // readLocalUpload validates the key against a strict pattern (no "..", no odd characters).
  const file = await readLocalUpload(joined);
  if (!file) return new Response("Not found", { status: 404 });

  const ext = joined.split(".").pop() ?? "";
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
