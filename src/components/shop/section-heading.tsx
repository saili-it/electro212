import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Storefront section title, retail-signage style: a slanted red marker, then the title in the
 * condensed display face, uppercase. Optional "Voir tout" link on the right.
 */
export function SectionHeading({
  id,
  title,
  kicker,
  href,
  linkLabel = "Voir tout",
  className = "",
}: {
  id: string;
  title: string;
  /** Small line above the title (e.g. "Sélection Electro212"). */
  kicker?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div className="flex min-w-0 items-stretch gap-3">
        <span aria-hidden className="w-2 shrink-0 -skew-x-12 bg-brand-red-600" />
        <div className="min-w-0">
          {kicker && (
            <p className="font-display text-sm font-bold uppercase tracking-[0.18em] text-brand-red-600">{kicker}</p>
          )}
          <h2
            id={id}
            className="font-display text-[1.75rem] font-extrabold uppercase leading-none tracking-tight text-brand-dark sm:text-4xl"
          >
            {title}
          </h2>
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 font-display text-base font-bold uppercase tracking-wide text-brand-dark transition hover:text-brand-red-600"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" strokeWidth={2.5} aria-hidden />
        </Link>
      )}
    </div>
  );
}
