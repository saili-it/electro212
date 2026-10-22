"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, buttonVariants, inputClass } from "@/components/admin/ui";
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  updateProductImageAltAction,
  uploadProductImagesAction,
} from "./image-actions";
import type { AddImagesResult } from "@/data/product-images";

export type ProductImageItem = { id: string; url: string; alt: string | null };

export function ProductImages({ productId, images }: { productId: string; images: ProductImageItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<AddImagesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: true } | { error: string }>, refresh = true) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if ("error" in r) setError(r.error);
      else if (refresh) router.refresh();
    });

  const upload = () => {
    const input = fileRef.current;
    if (!input?.files?.length) return;
    const fd = new FormData();
    for (const file of Array.from(input.files)) fd.append("images", file);
    startTransition(async () => {
      setError(null);
      const r = await uploadProductImagesAction(productId, fd);
      setResult(r);
      if (r.added > 0) router.refresh();
      if (fileRef.current) fileRef.current.value = "";
    });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= images.length) return;
    const ids = images.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderProductImagesAction(productId, ids));
  };

  const remove = (imageId: string) => {
    if (!window.confirm("Supprimer cette image ?")) return;
    run(() => deleteProductImageAction(productId, imageId));
  };

  const saveAlt = (imageId: string, alt: string, current: string | null) => {
    if (alt === (current ?? "")) return;
    run(() => updateProductImageAltAction(productId, imageId, alt), false);
  };

  return (
    <div className="space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {result && !error && (
        <Alert tone={result.skipped.length > 0 ? "error" : "success"}>
          {result.added} image(s) ajoutée(s)
          {result.skipped.length > 0 ? ` · ignorée(s) : ${result.skipped.map((s) => `${s.name} (${s.reason})`).join(", ")}` : "."}
        </Alert>
      )}

      {images.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune image. La première image ajoutée devient l&apos;image principale.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="rounded-xl border border-slate-200 bg-white p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- stored WebP, host not known for next/image */}
                <img src={image.url} alt={image.alt ?? ""} className="h-full w-full object-contain" />
                {index === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-navy px-2 py-0.5 text-[10px] font-semibold text-white">
                    Principale
                  </span>
                )}
              </div>
              <input
                type="text"
                defaultValue={image.alt ?? ""}
                placeholder="Texte alternatif"
                onBlur={(e) => saveAlt(image.id, e.target.value.trim(), image.alt)}
                className={`${inputClass} mt-2 text-xs`}
                disabled={pending}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={pending || index === 0}
                    aria-label="Déplacer à gauche"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-40"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={pending || index === images.length - 1}
                    aria-label="Déplacer à droite"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 enabled:hover:bg-slate-50 disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(image.id)}
                  disabled={pending}
                  className="text-xs font-medium text-brand-red-700 hover:underline disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={`${inputClass} sm:max-w-sm`}
          disabled={pending}
        />
        <button type="button" onClick={upload} disabled={pending} className={buttonVariants.secondary}>
          {pending ? "Traitement…" : "Ajouter les images"}
        </button>
        <span className="text-xs text-slate-500">JPEG, PNG ou WebP · converties en WebP · max 12 par produit.</span>
      </div>
    </div>
  );
}
