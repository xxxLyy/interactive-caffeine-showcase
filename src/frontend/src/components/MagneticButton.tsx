import { cn } from "@/lib/utils";
import { type PointerEvent, type ReactNode, useRef, useState } from "react";

interface MagneticButtonProps {
  onClick: () => void;
  children: ReactNode;
  className?: string;
  ocid: string;
  disabled?: boolean;
}

/** CTA that follows the pointer (±12px), rebounds on press, and pulses a ring halo. */
export function MagneticButton({
  onClick,
  children,
  className,
  ocid,
  disabled,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);

  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setOffset({ x: nx * 12, y: ny * 10 });
  };

  return (
    <div className="relative inline-flex">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border border-accent/70 animate-halo-pulse"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full border border-primary/50 animate-halo-pulse [animation-delay:1.2s]"
      />
      <button
        ref={ref}
        type="button"
        data-ocid={ocid}
        disabled={disabled}
        onClick={onClick}
        onPointerMove={onMove}
        onPointerLeave={() => {
          setOffset({ x: 0, y: 0 });
          setPressed(false);
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${pressed ? 0.94 : 1})`,
          transition: pressed
            ? "transform 160ms cubic-bezier(0.16, 1, 0.3, 1)"
            : "transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        className={cn(
          "group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-accent/60 bg-background/40 px-8 py-4 shadow-ring-halo backdrop-blur-md",
          "text-foreground transition-[border-color,background-color,box-shadow] duration-500 ease-out-expo",
          "hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background",
          "disabled:opacity-60",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(100deg,transparent,oklch(var(--accent)/0.25),transparent)] transition-transform duration-1000 ease-out-expo group-hover:translate-x-full"
        />
        {children}
      </button>
    </div>
  );
}
