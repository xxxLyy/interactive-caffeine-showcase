import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: "sm" | "md";
}

/** Hairline pill control: hover fills primary/15, press scales with spring rebound, active glows. */
export function PillButton({
  active = false,
  size = "md",
  className,
  children,
  ...rest
}: PillButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "group relative inline-flex select-none items-center justify-center gap-1.5 rounded-full border font-body",
        "transition-[transform,background-color,border-color,color,box-shadow] duration-500 ease-out-expo",
        "active:scale-[0.94] active:duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-8 px-3 text-[11px]" : "h-9 px-3.5 text-xs",
        active
          ? "border-primary/70 bg-primary/15 text-foreground shadow-[0_0_24px_-6px_oklch(var(--primary)/0.7)]"
          : "hairline bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
