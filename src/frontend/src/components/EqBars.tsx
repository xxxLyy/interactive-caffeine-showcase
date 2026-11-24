import { cn } from "@/lib/utils";

const EQ = ["eq-1", "eq-2", "eq-3"];

/** Three-bar equaliser glyph; animates while `live`. */
export function EqBars({ live }: { live: boolean }) {
  return (
    <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
      {EQ.map((id, i) => (
        <span
          key={id}
          className={cn(
            "h-full w-[3px] origin-bottom rounded-[1px] bg-primary",
            live ? "animate-eq-bar" : "scale-y-[0.3] opacity-60",
          )}
          style={{ animationDelay: `${i * -0.28}s` }}
        />
      ))}
    </span>
  );
}

export const trackRowClass = (active: boolean) =>
  cn(
    "group flex w-full min-w-0 items-center gap-2.5 rounded-md border px-2.5 py-2 text-left transition-ui active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "track-active-bar border-primary/40"
      : "border-transparent hover:border-foreground/10 hover:bg-foreground/[0.04]",
  );
