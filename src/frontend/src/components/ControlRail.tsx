import {
  KNOBS,
  type KnobId,
  type KnobValues,
  PALETTES,
  PRESETS,
  type PaletteId,
  type Preset,
  SHAPES,
  type ShapeId,
  WAVEFORMS,
  type Waveform,
} from "@/lib/instrument";
import { rangeClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import type { ReactNode } from "react";
import { Knob } from "./Knob";
import { PillButton } from "./PillButton";

interface ControlRailProps {
  knobs: KnobValues;
  onKnob: (id: KnobId, v: number) => void;
  waveform: Waveform;
  onWaveform: (w: Waveform) => void;
  shape: ShapeId;
  onShape: (s: ShapeId) => void;
  palette: PaletteId;
  onPalette: (p: PaletteId) => void;
  presetId: string | null;
  onPreset: (p: Preset) => void;
  volume: number;
  onVolume: (v: number) => void;
  muted: boolean;
  onMute: () => void;
}

function Group({
  zh,
  en,
  children,
}: { zh: string; en: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t border-foreground/[0.08] pt-4 first:border-t-0 first:pt-0">
      <h2 className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground/90">{zh}</span>
        <span className="readout text-[9px] text-muted-foreground">{en}</span>
      </h2>
      {children}
    </section>
  );
}

/** Synth + visual controls: knobs, waveforms, shapes, palettes, presets, master volume. */
export function ControlRail(p: ControlRailProps) {
  const year = new Date().getFullYear();
  return (
    <div className="flex flex-col gap-4">
      <Group zh="预设" en="Presets">
        <div className="grid grid-cols-2 gap-1.5">
          {PRESETS.map((preset, i) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={p.presetId === preset.id}
              data-ocid={`preset.item.${i + 1}`}
              onClick={() => p.onPreset(preset)}
              className={cn(
                "group flex flex-col items-start rounded-md border px-2.5 py-2 text-left",
                "transition-[transform,background-color,border-color,box-shadow] duration-500 ease-out-expo active:scale-[0.96]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                p.presetId === preset.id
                  ? "border-primary/60 bg-primary/15 shadow-[0_0_22px_-8px_oklch(var(--primary)/0.8)]"
                  : "hairline hover:border-primary/40 hover:bg-primary/10",
              )}
            >
              <span className="text-sm text-foreground">{preset.zh}</span>
              <span className="font-serif-italic text-[13px] leading-tight text-muted-foreground transition-colors duration-500 group-hover:text-primary">
                {preset.en}
              </span>
            </button>
          ))}
        </div>
      </Group>

      <Group zh="音色旋钮" en="Tone">
        <div className="grid grid-cols-4 gap-1 md:grid-cols-2 md:gap-y-3">
          {KNOBS.map((k) => (
            <Knob
              key={k.id}
              label={k.zh}
              sub={k.en}
              value={p.knobs[k.id]}
              onChange={(v) => p.onKnob(k.id, v)}
              ocid={`knob.${k.id}.input`}
            />
          ))}
        </div>
      </Group>

      <Group zh="波形" en="Waveform">
        <div className="grid grid-cols-2 gap-1.5">
          {WAVEFORMS.map((w) => (
            <PillButton
              key={w.id}
              size="sm"
              active={p.waveform === w.id}
              onClick={() => p.onWaveform(w.id)}
              data-ocid={`waveform.${w.id}.toggle`}
            >
              {w.zh}{" "}
              <span className="readout text-[9px] opacity-70">{w.en}</span>
            </PillButton>
          ))}
        </div>
      </Group>

      <Group zh="粒子形态" en="Form">
        <div className="grid grid-cols-2 gap-1.5">
          {SHAPES.map((s) => (
            <PillButton
              key={s.id}
              size="sm"
              active={p.shape === s.id}
              onClick={() => p.onShape(s.id)}
              data-ocid={`shape.${s.id}.toggle`}
            >
              {s.zh}{" "}
              <span className="readout text-[9px] opacity-70">{s.en}</span>
            </PillButton>
          ))}
        </div>
      </Group>

      <Group zh="色彩" en="Palette">
        <div className="grid grid-cols-3 gap-1">
          {PALETTES.map((pal) => (
            <button
              key={pal.id}
              type="button"
              aria-pressed={p.palette === pal.id}
              aria-label={`${pal.zh} ${pal.en}`}
              data-ocid={`palette.${pal.id}.toggle`}
              onClick={() => p.onPalette(pal.id)}
              className="group flex flex-col items-center gap-1.5 rounded-md py-1.5 transition-[transform,background-color] duration-500 ease-out-expo hover:bg-foreground/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
            >
              <span
                className={cn(
                  "size-5 rounded-full transition-[box-shadow,transform] duration-500 ease-spring group-hover:scale-110",
                  p.palette === pal.id &&
                    "ring-2 ring-ring ring-offset-2 ring-offset-background",
                )}
                style={{
                  background: `linear-gradient(135deg, ${pal.colors.a}, ${pal.colors.b})`,
                }}
              />
              <span className="text-[10px] leading-none text-foreground/85">
                {pal.zh}
              </span>
              <span className="readout text-[8px] text-muted-foreground">
                {pal.en}
              </span>
            </button>
          ))}
        </div>
      </Group>

      <Group zh="主音量" en="Master">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={p.onMute}
            aria-pressed={p.muted}
            data-ocid="master.mute.toggle"
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px]",
              "transition-[transform,background-color,border-color,color] duration-500 ease-out-expo active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              p.muted
                ? "border-destructive/60 bg-destructive/15 text-foreground"
                : "hairline text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground",
            )}
          >
            {p.muted ? (
              <VolumeX className="size-3.5" />
            ) : (
              <Volume2 className="size-3.5" />
            )}
            {p.muted ? "取消静音" : "静音"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(p.volume * 100)}
            aria-label="主音量 Master volume"
            data-ocid="master.volume.input"
            onChange={(e) => p.onVolume(Number(e.target.value) / 100)}
            className={cn(rangeClass, "min-w-0 flex-1")}
          />
          <span className="readout w-8 text-right text-foreground">
            {Math.round(p.volume * 100)}
          </span>
        </div>
      </Group>

      <p className="pt-1 text-[10px] text-muted-foreground/70">
        © {year}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
