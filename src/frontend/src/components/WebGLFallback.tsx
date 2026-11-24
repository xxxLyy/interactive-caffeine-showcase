import { MonitorX } from "lucide-react";

/** Designed fallback shown when WebGL cannot be initialised; the synth keeps working. */
export function WebGLFallback() {
  return (
    <div
      data-ocid="field.error_state"
      className="bg-atmosphere grain absolute inset-0 flex items-center justify-center p-6"
    >
      <div className="glass max-w-md rounded-lg p-7 text-center shadow-elevated animate-fade-up">
        <MonitorX
          className="mx-auto mb-4 size-7 text-accent"
          aria-hidden="true"
        />
        <p className="readout mb-2 text-accent">WebGL Unavailable</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          粒子场无法在此设备上渲染
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          你的浏览器或显卡未启用 WebGL。合成器、键盘与音序器仍可正常演奏——
          <span className="font-serif-italic text-foreground/90">
            {" "}
            the sound still resonates.
          </span>
        </p>
        <p className="mt-4 text-xs text-muted-foreground/80">
          尝试开启硬件加速，或使用最新版 Chrome / Safari / Firefox。
        </p>
      </div>
    </div>
  );
}
