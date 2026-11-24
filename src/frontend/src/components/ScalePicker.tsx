import { ROOTS, SCALES, type ScaleId } from "@/lib/scales";
import { cn } from "@/lib/utils";

interface ScalePickerProps {
  root: number;
  scale: ScaleId;
  onRoot: (root: number) => void;
  onScale: (scale: ScaleId) => void;
  /** Set when 跟弹 is steering the keyboard to a track's key. */
  jamLabel: string | null;
}

/** Key (12 roots) + scale selectors; drive sequencer rows and keyboard snapping. */
export function ScalePicker({
  root,
  scale,
  onRoot,
  onScale,
  jamLabel,
}: ScalePickerProps) {
  return (
    <section className="flex flex-col gap-2.5" data-ocid="scale.panel">
      <h2 className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/90">调式</span>
        <span className="readout text-[9px] text-muted-foreground">
          Key · Scale
        </span>
      </h2>
      <fieldset className="grid grid-cols-6 gap-1">
        <legend className="sr-only">主音 Key</legend>
        {ROOTS.map((name, i) => (
          <button
            key={name}
            type="button"
            aria-pressed={root === i}
            data-ocid={`scale.root.${i + 1}`}
            onClick={() => onRoot(i)}
            className={cn(
              "h-8 rounded-md border font-mono text-[11px] transition-ui active:scale-90",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              root === i
                ? "border-foreground/80 bg-foreground text-background shadow-[0_0_18px_-6px_oklch(var(--foreground)/0.7)]"
                : name.includes("#")
                  ? "hairline bg-background/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  : "hairline text-foreground/80 hover:border-primary/40 hover:bg-primary/10",
            )}
          >
            {name}
          </button>
        ))}
      </fieldset>
      <fieldset className="grid grid-cols-2 gap-1">
        <legend className="sr-only">音阶 Scale</legend>
        {SCALES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scale === s.id}
            data-ocid={`scale.${s.id}.toggle`}
            onClick={() => onScale(s.id)}
            className={cn(
              "flex h-9 flex-col items-start justify-center rounded-md border px-2 text-left transition-ui active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              scale === s.id
                ? "border-primary/70 bg-primary/15 shadow-[0_0_22px_-8px_oklch(var(--primary)/0.8)]"
                : "hairline hover:border-primary/40 hover:bg-primary/10",
            )}
          >
            <span className="text-[11px] leading-none text-foreground">
              {s.zh}
            </span>
            <span className="readout mt-0.5 text-[8px] text-muted-foreground">
              {s.en}
            </span>
          </button>
        ))}
      </fieldset>
      {jamLabel && (
        <p
          className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-[10px] leading-snug text-foreground/85"
          data-ocid="scale.jam.success_state"
        >
          跟弹中 · 琴键吸附到 <span className="font-mono">{jamLabel}</span>
        </p>
      )}
    </section>
  );
}
