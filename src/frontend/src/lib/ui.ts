/** Shared styling for native range inputs (track + thumb in palette tokens). */
export const rangeClass = [
  "h-5 cursor-pointer appearance-none bg-transparent",
  "focus-visible:outline-none",
  "[&::-webkit-slider-runnable-track]:h-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-muted",
  "[&::-webkit-slider-thumb]:-mt-[5.5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-background",
  "[&::-webkit-slider-thumb]:shadow-[0_0_12px_oklch(var(--accent)/0.7)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-300",
  "hover:[&::-webkit-slider-thumb]:scale-125 active:[&::-webkit-slider-thumb]:scale-90",
  "focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-ring focus-visible:[&::-webkit-slider-thumb]:ring-offset-2 focus-visible:[&::-webkit-slider-thumb]:ring-offset-background",
  "[&::-moz-range-track]:h-[3px] [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-muted",
  "[&::-moz-range-progress]:h-[3px] [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-accent",
  "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-background",
].join(" ");
