import {
  KEY_HIGH,
  KEY_LABELS,
  KEY_LOW,
  isBlackKey,
  midiToName,
} from "@/lib/instrument";
import { cn } from "@/lib/utils";
import { type KeyboardEvent, type PointerEvent, useRef } from "react";

interface KeyboardProps {
  active: Set<number>;
  onDown: (midi: number) => void;
  onUp: (midi: number) => void;
  /** In-scale keys glow; out-of-scale keys dim and snap to the nearest scale note. */
  inScale: (midi: number) => boolean;
}

const ALL = Array.from(
  { length: KEY_HIGH - KEY_LOW + 1 },
  (_, i) => KEY_LOW + i,
);
const WHITES = ALL.filter((m) => !isBlackKey(m));
const BLACKS = ALL.filter(isBlackKey).map((m) => ({
  midi: m,
  left: ((WHITES.indexOf(m - 1) + 1) / WHITES.length) * 100,
}));

/** Two-octave glass keyboard (C4–C6), mouse/touch with glide, labels show note + computer key. */
export function Keyboard({ active, onDown, onUp, inScale }: KeyboardProps) {
  const held = useRef(new Set<number>());
  const press = (midi: number) => {
    held.current.add(midi);
    onDown(midi);
  };
  const lift = (midi: number) => {
    if (!held.current.delete(midi)) return;
    onUp(midi);
  };
  const handlers = (midi: number) => ({
    onPointerDown: (e: PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      press(midi);
    },
    onPointerUp: () => lift(midi),
    onPointerCancel: () => lift(midi),
    onPointerLeave: () => lift(midi),
    onPointerEnter: (e: PointerEvent<HTMLButtonElement>) => {
      if (e.buttons === 1 && e.pointerType === "mouse") press(midi);
    },
    onKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        onDown(midi);
      }
    },
    onKeyUp: (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === " " || e.key === "Enter") onUp(midi);
    },
  });

  return (
    <div
      className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
      data-ocid="keyboard.panel"
    >
      <div className="relative h-[108px] min-w-[660px] select-none md:h-[118px] md:min-w-0">
        <div className="flex h-full gap-[3px]">
          {WHITES.map((midi) => {
            const on = active.has(midi);
            return (
              <button
                key={midi}
                type="button"
                aria-label={`琴键 ${midiToName(midi)}`}
                data-ocid={`keyboard.key.${midi - KEY_LOW + 1}`}
                {...handlers(midi)}
                className={cn(
                  "relative flex flex-1 touch-pan-x flex-col items-center justify-end gap-1 rounded-b-md border pb-2",
                  "transition-[transform,background-color,border-color,box-shadow] duration-500 ease-out-expo",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  on
                    ? "translate-y-[2px] border-primary/80 bg-primary/80 shadow-key-lit duration-100"
                    : "border-accent/25 bg-foreground/[0.04] hover:border-accent/60 hover:bg-accent/10 hover:shadow-[0_-8px_24px_-12px_oklch(var(--accent)/0.6)]",
                  !on && !inScale(midi) && "opacity-45",
                )}
              >
                {inScale(midi) && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-2 size-1 rounded-full transition-ui",
                      on ? "bg-primary-foreground" : "bg-accent/80",
                    )}
                  />
                )}
                {KEY_LABELS[midi] && (
                  <span
                    className={cn(
                      "readout text-[9px]",
                      on
                        ? "text-primary-foreground"
                        : "text-muted-foreground/70",
                    )}
                  >
                    {KEY_LABELS[midi]}
                  </span>
                )}
                <span
                  className={cn(
                    "font-mono text-[10px]",
                    on ? "text-primary-foreground" : "text-foreground/70",
                  )}
                >
                  {midiToName(midi)}
                </span>
              </button>
            );
          })}
        </div>
        {BLACKS.map(({ midi, left }) => {
          const on = active.has(midi);
          return (
            <button
              key={midi}
              type="button"
              aria-label={`琴键 ${midiToName(midi)}`}
              data-ocid={`keyboard.key.${midi - KEY_LOW + 1}`}
              {...handlers(midi)}
              style={{ left: `calc(${left}% - 2.2%)`, width: "4.4%" }}
              className={cn(
                "absolute top-0 z-10 flex h-[60%] touch-pan-x flex-col items-center justify-end rounded-b-md border pb-1.5",
                "transition-[transform,background-color,border-color,box-shadow] duration-500 ease-out-expo",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                on
                  ? "translate-y-[2px] border-primary bg-primary shadow-key-lit duration-100"
                  : "border-accent/40 bg-background/90 backdrop-blur hover:border-accent hover:bg-secondary",
                !on && inScale(midi) && "border-accent/80",
                !on && !inScale(midi) && "opacity-60",
              )}
            >
              <span
                className={cn(
                  "readout text-[8px]",
                  on ? "text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {KEY_LABELS[midi] ?? ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
