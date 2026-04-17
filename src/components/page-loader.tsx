import { ManifestMark } from "@/components/manifest-mark";

/**
 * Centered page/section loader using the animated Manifest mark.
 * For prominent loading states (>=32px context) where the branded motion
 * reads clearly. Use Loader2 for inline button/status indicators.
 */
export function PageLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-[50vh]">
      <ManifestMark
        size={48}
        mode="primary"
        animated
        className="text-white/90"
      />
      {label && <p className="text-xs text-zinc-500">{label}</p>}
    </div>
  );
}
