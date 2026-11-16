import { formatMegabytes, type ImageSpec } from "@/lib/image-specs";

/**
 * The format and size an image field needs, shown under the input. Driven by
 * lib/image-specs.ts, the same data the server validates uploads against.
 */
export function ImageSpecHint({ spec }: { spec: ImageSpec }) {
  const { recommended, rules } = spec;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="font-semibold text-slate-700">Format</dt>
        <dd>
          {spec.formats}
          {rules && " — converti en WebP et optimisé automatiquement"}
        </dd>
        <dt className="font-semibold text-slate-700">Taille conseillée</dt>
        <dd>
          <span className="font-semibold text-slate-800">
            {recommended.width} × {recommended.height} px
          </span>{" "}
          (format {spec.ratio})
        </dd>
        {rules && (
          <>
            <dt className="font-semibold text-slate-700">Minimum</dt>
            <dd>
              {rules.minWidth} × {rules.minHeight} px
            </dd>
            <dt className="font-semibold text-slate-700">Poids max</dt>
            <dd>{formatMegabytes(rules.maxBytes)}</dd>
          </>
        )}
      </dl>
      {spec.tips.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-slate-500">
          {spec.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
