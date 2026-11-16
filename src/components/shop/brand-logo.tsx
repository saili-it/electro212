"use client";

import { useState } from "react";

/**
 * Brand logo from the address saved in the admin (a file in /brands/ or a web
 * link). Sized by `className` (a max height and width); falls back to the
 * brand name if the image can't load.
 */
export function BrandLogo({
  src,
  name,
  className = "max-h-9 max-w-[80%] sm:max-h-11",
}: {
  src: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{name}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin-provided address, host not known in advance
    <img
      src={src}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`h-auto w-auto object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
