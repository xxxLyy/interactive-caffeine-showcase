import { cn } from "@/lib/utils";
import { type KeyboardEvent, type PointerEvent, useRef } from "react";

interface KnobProps {
  label: string;
  sub: string;
  value: number;
  onChange: (v: number) => void;
  ocid: string;
}

const SWEEP = 270;
const R = 26;
const CIRC = 2 * Math.PI * R;
const ARC = (SWEEP / 360) * CIRC;
const TICKS = Array.from({ length: 11 }, (_, i) => ({
  id: `tick-${i}`,
  angle: -135 + i * 27,
}));

/** 270° rotary knob: vertical drag (Shift = fine) and arrow keys; exposes role slider. */
export function Knob({ label, sub, value, onChange, ocid }: KnobProps) {
  const drag = useRef<{ y: number; v: number } | null>(null);
  const clamp = (v: number) => Math.round(Math.min(100, Math.max(0, v)));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus();
    drag.current = { y: e.clientY, v: value };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const scale = e.shiftKey ? 0.15 : 0.55;
    onChange(clamp(drag.current.v + (drag.current.y - e.clientY) * scale));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
      PageUp: 10,
      PageDown: -10,
    };
    if (e.key in steps) {
      e.preventDefault();
      onChange(clamp(value + steps[e.key] * (e.shiftKey ? 5 : 1)));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(0);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(100);
    }
  };

  const angle = -135 + (value / 100) * SWEEP;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        role="slider"
        tabIndex={0}
        aria-label={`${label} ${sub}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-orientation="vertical"
        data-ocid={ocid}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "group relative size-[68px] cursor-ns-resize touch-none select-none rounded-full outline-none",
          "transition-transform duration-500 ease-spring hover:scale-[1.04] active:scale-[0.97]",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        )}
      >
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 size-full rotate-[135deg]"
          aria-hidden="true"
        >
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-muted"
            strokeDasharray={`${ARC} ${CIRC}`}
          />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-accent transition-[stroke] duration-1000 drop-shadow-[0_0_6px_oklch(var(--accent)/0.8)]"
            strokeDasharray={`${(value / 100) * ARC} ${CIRC}`}
          />
        </svg>
        <svg
          viewBox="0 0 64 64"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {TICKS.map((t) => (
            <line
              key={t.id}
              x1="32"
              y1="1.5"
              x2="32"
              y2="3.5"
              className="stroke-foreground/25"
              strokeWidth="1"
              transform={`rotate(${t.angle} 32 32)`}
            />
          ))}
        </svg>
        <div className="glass absolute inset-[11px] rounded-full shadow-subtle transition-colors duration-500 group-hover:border-accent/40">
          <span
            className="absolute left-1/2 top-[5px] h-[7px] w-[2px] -translate-x-1/2 rounded-full bg-primary transition-colors duration-1000"
            style={{
              transformOrigin: "50% 18.5px",
              transform: `translateX(-50%) rotate(${angle}deg)`,
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[13px] tabular-nums text-foreground">
            {value}
          </span>
        </div>
      </div>
      <span className="text-[11px] leading-none text-foreground/85">
        {label}{" "}
        <span className="readout text-[9px] text-muted-foreground">{sub}</span>
      </span>
    </div>
  );
}
