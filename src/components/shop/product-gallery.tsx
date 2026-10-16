"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlaceholderIcon } from "./icons";

/** Product image gallery: a large main image with a thumbnail strip to switch. */
export function ProductGallery({ images, name }: { images: { url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-white ring-1 ring-slate-200/70">
        <ImagePlaceholderIcon className="h-24 w-24 text-slate-200" />
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="flex flex-col gap-4 sm:flex-row-reverse sm:items-start">
      <div className="relative flex aspect-square flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
        <Image
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(min-width: 1024px) 45vw, (min-width: 640px) 60vw, 100vw"
          className="object-contain p-6"
        />
      </div>

      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto sm:flex-col">
          {images.map((img, i) => (
            <li key={img.url}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Voir l'image ${i + 1}`}
                aria-current={i === active}
                className={`relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 transition ${
                  i === active ? "ring-2 ring-brand-red-600" : "ring-slate-200 hover:ring-brand-red/40"
                }`}
              >
                <Image src={img.url} alt="" fill sizes="64px" className="object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
