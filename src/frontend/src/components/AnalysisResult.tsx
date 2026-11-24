import type { UserTrackSettings } from "@/hooks/useUserTracks";
import { ROOTS } from "@/lib/scales";
import { formatTime, stepDuration, trackDuration } from "@/lib/tracks";
import {
  MAX_BPM,
  MIN_BPM,
  type Mode,
  type UserArrangement,
  type UserTrackRecord,
  chordLabel,
  chordRuns,
  modeLabel,
} from "@/lib/userTracks";
import { cn } from "@/lib/utils";
import { Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PillButton } from "./PillButton";

interface AnalysisResultProps {
  record: UserTrackRecord;
  arrangement: UserArrangement;
  current: boolean;
  playing: boolean;
  getPosition: () => number;
  onPlay: () => void;
  onUpdate: (settings: UserTrackSettings) => void;
  onClose: () => void;
}

const MAX_RUNS = 12;
const MODES: Mode[] = ["major", "minor"];
const clampBpm = (v: number) =>
  Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(v)));

/** Generated result card: detected BPM / key / chords, live re-arrangement controls and 立即演奏. */
export function AnalysisResult(p: AnalysisResultProps) {
  const { record, arrangement, getPosition } = p;
  const { track, density } = arrangement;
  const [bpmDraft, setBpmDraft] = useState(String(record.bpm));
  const chipsRef = useRef<HTMLOListElement>(null);
  const runs = useMemo(() => chordRuns(track), [track]);
  const shown = useMemo(() => runs.slice(0, MAX_RUNS), [runs]);
  const live = p.current && p.playing;
  const detected = record.analysis;
  const edited =
    record.bpm !== Math.round(detected.bpm) ||
    record.root !== detected.root ||
    record.mode !== detected.mode;
  const mode = modeLabel(record.mode);

  useEffect(() => setBpmDraft(String(record.bpm)), [record.bpm]);

  useEffect(() => {
    const chips = chipsRef.current?.children;
    const clear = () => {
      if (chips)
        for (let i = 0; i < chips.length; i++)
          chips[i].classList.remove("chord-chip-current");
    };
    if (!live) {
      clear();
      return;
    }
    const barDur = stepDuration(track) * 16;
    let raf = 0;
    const tick = () => {
      const bar = Math.floor(getPosition() / barDur);
      const at = shown.findIndex(
        (r) => bar >= r.start && bar < r.start + r.bars,
      );
      if (chips)
        for (let i = 0; i < chips.length; i++)
          chips[i].classList.toggle("chord-chip-current", i === at);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clear();
    };
  }, [live, track, shown, getPosition]);

  const commitBpm = (v: number) => {
    if (!Number.isFinite(v)) {
      setBpmDraft(String(record.bpm));
      return;
    }
    const next = clampBpm(v);
    setBpmDraft(String(next));
    if (next !== record.bpm) p.onUpdate({ bpm: next });
  };

  return (
    <article
      key={record.id}
      className="hairline relative animate-card-reveal overflow-hidden rounded-lg border bg-background/50 p-3"
      data-ocid="analysis.result.card"
      aria-label={`分析结果 ${record.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="readout min-w-0 truncate text-[9px] text-accent">
          生成完成 Generated ·{" "}
          <span className="text-muted-foreground">{record.name}</span>
        </p>
        <button
          type="button"
          aria-label="收起结果 Close"
          data-ocid="analysis.close_button"
          onClick={p.onClose}
          className="-mr-1 -mt-1 grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-ui hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="font-display text-6xl font-bold leading-[0.85] tracking-[-0.06em] text-foreground tabular-nums">
          {record.bpm}
        </p>
        <span className="readout pb-1 text-[9px] text-muted-foreground">
          BPM
        </span>
      </div>
      <p className="mt-1.5 font-display text-2xl font-bold uppercase leading-none tracking-[-0.03em]">
        <span className="text-stroke">
          {ROOTS[record.root]} {mode.en}
        </span>
        <span className="ml-2 align-middle font-body text-xs font-normal normal-case tracking-normal text-muted-foreground">
          {ROOTS[record.root]} {mode.zh}
        </span>
      </p>

      <ol
        ref={chipsRef}
        className="mt-3 flex flex-wrap gap-1"
        aria-label="和弦进行 Chord progression"
      >
        {shown.map((r) => (
          <li
            key={r.start}
            className="chord-chip rounded-md px-2 py-1 text-[11px] text-foreground/85 transition-ui"
            title={`第 ${r.start + 1} 小节 · ${r.bars} 小节`}
          >
            {chordLabel(record.root, track.scale, r.degree)}
            {r.bars > 1 && (
              <span className="ml-0.5 text-[9px] text-muted-foreground">
                ×{r.bars}
              </span>
            )}
          </li>
        ))}
        {runs.length > MAX_RUNS && (
          <li className="readout self-center px-1 text-[9px] text-muted-foreground">
            +{runs.length - MAX_RUNS}
          </li>
        )}
      </ol>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-foreground/[0.08] pt-2.5">
        <div>
          <dt className="readout text-[8px] text-muted-foreground">
            小节 Bars
          </dt>
          <dd className="readout text-foreground">{track.bars}</dd>
        </div>
        <div>
          <dt className="readout text-[8px] text-muted-foreground">
            时长 Time
          </dt>
          <dd className="readout text-foreground">
            {formatTime(trackDuration(track))}
          </dd>
        </div>
        <div>
          <dt className="readout text-[8px] text-muted-foreground">
            鼓密度 Drums
          </dt>
          <dd className="flex items-center gap-1.5">
            <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="progress-hairline absolute inset-0 origin-left"
                style={{ transform: `scaleX(${Math.max(0.04, density)})` }}
              />
            </span>
            <span className="readout text-foreground">
              {Math.round(density * 100)}
            </span>
          </dd>
        </div>
      </dl>

      <fieldset className="mt-3 flex flex-col gap-2 border-t border-foreground/[0.08] pt-2.5">
        <legend className="sr-only">微调识别结果 Fine-tune</legend>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`bpm-${record.id}`}
            className="text-[11px] text-foreground/85"
          >
            速度{" "}
            <span className="readout text-[8px] text-muted-foreground">
              BPM
            </span>
          </label>
          <div className="flex items-center gap-1">
            <PillButton
              size="sm"
              aria-label="减慢 BPM −1"
              data-ocid="analysis.bpm_down_button"
              onClick={() => commitBpm(record.bpm - 1)}
              disabled={record.bpm <= MIN_BPM}
              className="h-7 w-7 px-0"
            >
              <Minus className="size-3" />
            </PillButton>
            <input
              id={`bpm-${record.id}`}
              type="number"
              inputMode="numeric"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpmDraft}
              data-ocid="analysis.bpm.input"
              onChange={(e) => setBpmDraft(e.target.value)}
              onBlur={() => commitBpm(Number(bpmDraft))}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitBpm(Number(bpmDraft));
              }}
              className="readout hairline h-7 w-14 rounded-md border bg-transparent text-center text-foreground transition-ui [appearance:textfield] focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-inner-spin-button]:appearance-none"
            />
            <PillButton
              size="sm"
              aria-label="加快 BPM +1"
              data-ocid="analysis.bpm_up_button"
              onClick={() => commitBpm(record.bpm + 1)}
              disabled={record.bpm >= MAX_BPM}
              className="h-7 w-7 px-0"
            >
              <Plus className="size-3" />
            </PillButton>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor={`root-${record.id}`}
            className="text-[11px] text-foreground/85"
          >
            根音{" "}
            <span className="readout text-[8px] text-muted-foreground">
              Root
            </span>
          </label>
          <div className="flex items-center gap-1">
            <select
              id={`root-${record.id}`}
              value={record.root}
              data-ocid="analysis.root.select"
              onChange={(e) => p.onUpdate({ root: Number(e.target.value) })}
              className="readout hairline h-7 cursor-pointer rounded-md border bg-background px-1.5 text-foreground transition-ui hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROOTS.map((r, i) => (
                <option key={r} value={i}>
                  {r}
                </option>
              ))}
            </select>
            <fieldset className="hairline flex rounded-full border p-0.5">
              <legend className="sr-only">大调或小调 Mode</legend>
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={record.mode === m}
                  data-ocid={`analysis.mode.${m}.toggle`}
                  onClick={() => p.onUpdate({ mode: m })}
                  className={cn(
                    "h-6 rounded-full px-2 text-[11px] transition-ui focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95",
                    record.mode === m
                      ? "bg-primary/20 text-foreground shadow-[0_0_14px_-4px_oklch(var(--primary)/0.8)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {modeLabel(m).zh}
                </button>
              ))}
            </fieldset>
          </div>
        </div>
        {edited && (
          <button
            type="button"
            data-ocid="analysis.reset_button"
            onClick={() =>
              p.onUpdate({
                bpm: clampBpm(detected.bpm),
                root: detected.root,
                mode: detected.mode,
              })
            }
            className="readout flex items-center gap-1 self-start rounded-sm text-[9px] text-muted-foreground transition-ui hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <RotateCcw className="size-2.5" />
            恢复识别值 · {Math.round(detected.bpm)} BPM {ROOTS[detected.root]}{" "}
            {modeLabel(detected.mode).en}
          </button>
        )}
      </fieldset>

      <button
        type="button"
        data-ocid="analysis.play.primary_button"
        onClick={p.onPlay}
        className={cn(
          "group mt-3 flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 font-display text-sm font-bold tracking-[-0.01em] transition-ui active:scale-[0.96]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          live
            ? "border-accent bg-accent/15 text-foreground shadow-[0_0_28px_-6px_oklch(var(--accent)/0.9)]"
            : "border-accent/80 text-accent shadow-[0_0_24px_-10px_oklch(var(--accent))] hover:bg-accent/10 hover:shadow-[0_0_32px_-6px_oklch(var(--accent)/0.9)]",
        )}
      >
        {live ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 transition-transform duration-500 ease-spring group-hover:scale-110" />
        )}
        {live ? "暂停演奏" : "立即演奏"}
        <span className="readout text-[9px] opacity-80">
          {live ? "Pause" : "Play"}
        </span>
      </button>
    </article>
  );
}
