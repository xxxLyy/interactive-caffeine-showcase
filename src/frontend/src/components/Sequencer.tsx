import { DRUM_ROWS, SEQ_STEPS, midiToName } from "@/lib/instrument";
import { rangeClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { Dice5, Eraser, Minus, Pause, Play, Plus } from "lucide-react";
import { PillButton } from "./PillButton";

interface SequencerProps {
  grid: boolean[][];
  drums: boolean[][];
  pitches: number[];
  step: number;
  playing: boolean;
  bpm: number;
  onToggle: (row: number, step: number) => void;
  onDrumToggle: (row: number, step: number) => void;
  onPlayToggle: () => void;
  onBpm: (bpm: number) => void;
  onClear: () => void;
  onRandom: () => void;
}

const STEP_IDS = Array.from({ length: SEQ_STEPS }, (_, i) => i);

function cellClass(on: boolean, cursor: boolean, beat: boolean, drum: boolean) {
  return cn(
    "rounded-[3px] border",
    drum ? "h-[11px] md:h-[12px]" : "h-[13px] md:h-[15px]",
    "transition-[transform,background-color,border-color,box-shadow] duration-500 ease-out-expo",
    "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90",
    beat ? "border-foreground/15" : "border-foreground/[0.07]",
    on
      ? drum
        ? "border-accent/80 bg-accent/65"
        : "border-primary/80 bg-primary/70"
      : drum
        ? "bg-foreground/[0.02] hover:bg-accent/20"
        : "bg-foreground/[0.03] hover:bg-primary/20",
    cursor && !on && "border-accent/70 bg-accent/15 animate-scan-blink",
    cursor &&
      on &&
      "scale-110 bg-foreground shadow-[0_0_18px_2px_oklch(var(--primary)/0.85)] duration-75",
  );
}

/** 16-step grid: 8 scale rows + kick/snare/hat rows, lookahead-scheduled scan cursor. */
export function Sequencer({
  grid,
  drums,
  pitches,
  step,
  playing,
  bpm,
  onToggle,
  onDrumToggle,
  onPlayToggle,
  onBpm,
  onClear,
  onRandom,
}: SequencerProps) {
  const clampBpm = (v: number) => Math.min(180, Math.max(60, Math.round(v)));
  return (
    <div className="flex flex-col gap-2.5" data-ocid="sequencer.panel">
      <div className="flex flex-wrap items-center gap-2">
        <PillButton
          active={playing}
          onClick={onPlayToggle}
          data-ocid="sequencer.play.toggle"
          aria-label={playing ? "暂停 Pause" : "播放 Play"}
          className="min-w-[104px]"
        >
          {playing ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {playing ? "暂停" : "播放"}
          <span className="readout text-[9px] opacity-70">
            {playing ? "Pause" : "Play"}
          </span>
        </PillButton>

        <div className="hairline flex h-9 items-center gap-2 rounded-full border pl-1 pr-3">
          <button
            type="button"
            aria-label="降低 BPM"
            data-ocid="sequencer.bpm_down.button"
            onClick={() => onBpm(clampBpm(bpm - 1))}
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-[transform,color,background-color] duration-500 ease-out-expo hover:bg-primary/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="range"
            min={60}
            max={180}
            value={bpm}
            aria-label="速度 BPM"
            data-ocid="sequencer.bpm.input"
            onChange={(e) => onBpm(clampBpm(Number(e.target.value)))}
            className={cn(rangeClass, "w-24 md:w-28")}
          />
          <button
            type="button"
            aria-label="提高 BPM"
            data-ocid="sequencer.bpm_up.button"
            onClick={() => onBpm(clampBpm(bpm + 1))}
            className="grid size-7 place-items-center rounded-full text-muted-foreground transition-[transform,color,background-color] duration-500 ease-out-expo hover:bg-primary/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
          >
            <Plus className="size-3.5" />
          </button>
          <span className="readout w-[4.5rem] text-foreground">
            {bpm} <span className="text-muted-foreground">BPM</span>
          </span>
        </div>

        <PillButton
          onClick={onClear}
          data-ocid="sequencer.clear.button"
          size="sm"
        >
          <Eraser className="size-3.5" /> 清空{" "}
          <span className="readout text-[9px] opacity-70">Clear</span>
        </PillButton>
        <PillButton
          onClick={onRandom}
          data-ocid="sequencer.random.button"
          size="sm"
        >
          <Dice5 className="size-3.5" /> 随机{" "}
          <span className="readout text-[9px] opacity-70">Random</span>
        </PillButton>
      </div>

      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="grid min-w-[640px] grid-cols-[2.25rem_repeat(16,minmax(0,1fr))] gap-[3px] md:min-w-0">
          {pitches.map((midi, r) => (
            <div key={midi} className="contents">
              <span className="readout flex items-center text-[9px] text-muted-foreground transition-ui">
                {midiToName(midi)}
              </span>
              {STEP_IDS.map((s) => (
                <button
                  key={`${midi}-${s}`}
                  type="button"
                  aria-pressed={grid[r][s]}
                  aria-label={`${midiToName(midi)} 第 ${s + 1} 步`}
                  data-ocid={`sequencer.cell.${r * SEQ_STEPS + s + 1}`}
                  onClick={() => onToggle(r, s)}
                  className={cellClass(
                    grid[r][s],
                    playing && s === step,
                    s % 4 === 0,
                    false,
                  )}
                />
              ))}
            </div>
          ))}
          <div className="col-span-full my-0.5 h-px bg-foreground/[0.08]" />
          {DRUM_ROWS.map((d, r) => (
            <div key={d.id} className="contents">
              <span
                className="flex items-center text-[9px] text-muted-foreground"
                title={d.en}
              >
                {d.zh}
              </span>
              {STEP_IDS.map((s) => (
                <button
                  key={`${d.id}-${s}`}
                  type="button"
                  aria-pressed={drums[r][s]}
                  aria-label={`${d.zh} ${d.en} 第 ${s + 1} 步`}
                  data-ocid={`sequencer.drum.${r * SEQ_STEPS + s + 1}`}
                  onClick={() => onDrumToggle(r, s)}
                  className={cellClass(
                    drums[r][s],
                    playing && s === step,
                    s % 4 === 0,
                    true,
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
