import type { SongAnalysisApi } from "@/hooks/useSongAnalysis";
import type { UserTracksApi } from "@/hooks/useUserTracks";
import { DEMO_TRACK } from "@/lib/demoTrack";
import type { BestScores } from "@/lib/game";
import { ROOTS, getScale } from "@/lib/scales";
import { TRACKS, type Track, formatTime, trackDuration } from "@/lib/tracks";
import { rangeClass } from "@/lib/ui";
import { arrangeUserTrack } from "@/lib/userTracks";
import { cn } from "@/lib/utils";
import {
  Pause,
  Play,
  Repeat1,
  SkipBack,
  SkipForward,
  Swords,
  Trophy,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { AnalysisResult } from "./AnalysisResult";
import { EqBars, trackRowClass } from "./EqBars";
import { PillButton } from "./PillButton";
import { UploadZone } from "./UploadZone";
import { UserTrackList } from "./UserTrackList";

interface TrackPanelProps {
  library: Track[];
  index: number;
  playing: boolean;
  loop: boolean;
  jam: boolean;
  best: BestScores;
  trackVolume: number;
  balance: number;
  userTracks: UserTracksApi;
  analysis: SongAnalysisApi;
  resultId: string | null;
  onResult: (id: string | null) => void;
  onDeleteTrack: (id: string) => void;
  getPosition: () => number;
  onSelect: (index: number) => void;
  onPlayToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLoop: () => void;
  onJam: () => void;
  onTrackVolume: (v: number) => void;
  onBalance: (v: number) => void;
  onChallenge: () => void;
}

const BEATS = ["b-1", "b-2", "b-3", "b-4"];

/** 曲库: track list, transport, now-playing progress, mix, jam and challenge entry. */
export function TrackPanel(p: TrackPanelProps) {
  const track = p.library[p.index];
  const fillRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const beatsRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const { getPosition } = p;
  const duration = trackDuration(track);
  const spb = 60 / track.bpm;
  const resultRecord = p.userTracks.records.find((r) => r.id === p.resultId);
  const resultIndex = resultRecord
    ? p.library.findIndex((t) => t.id === resultRecord.id)
    : -1;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pos = getPosition();
      if (fillRef.current)
        fillRef.current.style.transform = `scaleX(${Math.min(1, pos / duration)})`;
      if (timeRef.current) timeRef.current.textContent = formatTime(pos);
      const beat = Math.floor(pos / spb) % 4;
      const dots = beatsRef.current?.children;
      if (dots)
        for (let i = 0; i < dots.length; i++)
          (dots[i] as HTMLElement).dataset.on = String(i === beat && pos > 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getPosition, duration, spb]);

  return (
    <section className="flex flex-col gap-3" data-ocid="tracks.panel">
      <h2 className="flex items-baseline justify-between">
        <span className="font-display text-lg font-bold leading-none tracking-[-0.03em] text-foreground">
          曲库
        </span>
        <span className="readout text-[9px] text-muted-foreground">
          Track Library
        </span>
      </h2>

      <div
        className="hairline relative overflow-hidden rounded-lg border bg-background/40 p-3"
        data-ocid="tracks.now_playing.card"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="readout text-[9px] text-accent">
              {p.playing ? "Now Playing" : "Paused"} · {track.styleEn}
            </p>
            <p
              key={track.id}
              className="mt-1 truncate font-display text-xl font-bold leading-tight tracking-[-0.03em] text-foreground animate-fade-up [animation-duration:500ms]"
            >
              {track.zh}
            </p>
            <p className="font-serif-italic truncate text-sm text-muted-foreground">
              {track.en}
            </p>
          </div>
          <EqBars live={p.playing} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div ref={beatsRef} className="flex gap-1" aria-hidden="true">
            {BEATS.map((id, i) => (
              <span
                key={id}
                className={cn(
                  "size-1.5 rounded-full bg-foreground/20 transition-[transform,background-color] duration-150",
                  "data-[on=true]:scale-125 data-[on=true]:bg-accent",
                  i === 0 && "data-[on=true]:bg-primary",
                )}
              />
            ))}
          </div>
          <div
            className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
            data-ocid="tracks.progress.loading_state"
          >
            <div
              ref={fillRef}
              className="progress-hairline absolute inset-0 origin-left"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <span className="readout text-[9px] text-muted-foreground">
            <span ref={timeRef} className="text-foreground">
              0:00
            </span>{" "}
            / {formatTime(duration)}
          </span>
        </div>
        <p className="readout mt-2 text-[9px] text-muted-foreground">
          {track.bpm} BPM · {ROOTS[track.root]} {getScale(track.scale).en}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <PillButton
          size="sm"
          aria-label="上一首 Previous"
          data-ocid="tracks.pagination_prev"
          onClick={p.onPrev}
          className="w-10 px-0"
        >
          <SkipBack className="size-3.5" />
        </PillButton>
        <PillButton
          active={p.playing}
          aria-label={p.playing ? "暂停曲目 Pause" : "播放曲目 Play"}
          data-ocid="tracks.play.toggle"
          onClick={p.onPlayToggle}
          className="flex-1"
        >
          {p.playing ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
          {p.playing ? "暂停" : "播放"}
        </PillButton>
        <PillButton
          size="sm"
          aria-label="下一首 Next"
          data-ocid="tracks.pagination_next"
          onClick={p.onNext}
          className="w-10 px-0"
        >
          <SkipForward className="size-3.5" />
        </PillButton>
        <PillButton
          size="sm"
          active={p.loop}
          aria-label="单曲循环 Loop track"
          title="单曲循环 Loop"
          data-ocid="tracks.loop.toggle"
          onClick={p.onLoop}
          className="w-10 px-0"
        >
          <Repeat1 className="size-3.5" />
        </PillButton>
      </div>

      <UploadZone analysis={p.analysis} inputRef={uploadRef} />

      {resultRecord && resultIndex >= 0 && (
        <AnalysisResult
          key={resultRecord.id}
          record={resultRecord}
          arrangement={arrangeUserTrack(resultRecord)}
          current={resultIndex === p.index}
          playing={p.playing}
          getPosition={getPosition}
          onPlay={() =>
            resultIndex === p.index ? p.onPlayToggle() : p.onSelect(resultIndex)
          }
          onUpdate={(settings) =>
            p.userTracks.update(resultRecord.id, settings)
          }
          onClose={() => p.onResult(null)}
        />
      )}

      <h3 className="flex items-baseline justify-between px-0.5">
        <span className="text-sm font-medium text-foreground">内置曲目</span>
        <span className="readout text-[9px] text-muted-foreground">
          Built-in · {TRACKS.length}
        </span>
      </h3>
      <ol className="flex flex-col gap-1" data-ocid="tracks.list">
        {TRACKS.map((t, i) => {
          const active = i === p.index;
          const best = p.best[t.id];
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                data-ocid={`tracks.item.${i + 1}`}
                onClick={() => p.onSelect(i)}
                className={trackRowClass(active)}
              >
                <span
                  className={cn(
                    "readout w-4 text-[10px]",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm text-foreground">
                      {t.zh}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {t.styleZh}
                    </span>
                  </span>
                  <span className="readout block truncate text-[9px] text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">
                    {t.en} · {t.bpm} BPM
                  </span>
                </span>
                {active && p.playing ? (
                  <EqBars live />
                ) : best ? (
                  <span
                    className="readout flex items-center gap-1 text-[9px] text-rank-s"
                    title="最佳成绩 Best"
                  >
                    <Trophy className="size-3" />
                    {best.toLocaleString()}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <UserTrackList
        demo={DEMO_TRACK}
        tracks={p.userTracks.tracks}
        offset={TRACKS.length}
        activeIndex={p.index}
        playing={p.playing}
        best={p.best}
        tunedId={resultRecord ? resultRecord.id : null}
        persistFailed={p.userTracks.persistFailed}
        onSelect={p.onSelect}
        onRename={p.userTracks.rename}
        onTune={(id) => p.onResult(p.resultId === id ? null : id)}
        onDelete={p.onDeleteTrack}
        onUpload={() => uploadRef.current?.click()}
      />

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5 gap-y-1.5">
        <label
          htmlFor="track-volume"
          className="text-[11px] text-foreground/85"
        >
          曲目音量
        </label>
        <input
          id="track-volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(p.trackVolume * 100)}
          data-ocid="tracks.volume.input"
          onChange={(e) => p.onTrackVolume(Number(e.target.value) / 100)}
          className={cn(rangeClass, "min-w-0")}
        />
        <span className="readout w-8 text-right text-foreground">
          {Math.round(p.trackVolume * 100)}
        </span>
        <label
          htmlFor="track-balance"
          className="text-[11px] text-foreground/85"
        >
          混音平衡
        </label>
        <input
          id="track-balance"
          type="range"
          min={-100}
          max={100}
          value={Math.round(p.balance * 100)}
          data-ocid="tracks.balance.input"
          onChange={(e) => p.onBalance(Number(e.target.value) / 100)}
          onDoubleClick={() => p.onBalance(0)}
          className={cn(rangeClass, "min-w-0")}
        />
        <span className="readout w-8 text-right text-[9px] text-muted-foreground">
          {p.balance < -0.05 ? "曲" : p.balance > 0.05 ? "奏" : "="}
        </span>
        <span className="readout col-start-2 flex justify-between text-[8px] text-muted-foreground/80">
          <span>Track</span>
          <span>Live</span>
        </span>
      </div>

      <button
        type="button"
        aria-pressed={p.jam}
        data-ocid="tracks.jam.switch"
        onClick={p.onJam}
        className={cn(
          "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-ui active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          p.jam
            ? "border-accent/60 bg-accent/10"
            : "hairline hover:border-accent/40 hover:bg-accent/5",
        )}
      >
        <span>
          <span className="block text-sm text-foreground">跟弹模式</span>
          <span className="readout block text-[9px] text-muted-foreground">
            Jam Along ·{" "}
            {p.jam && !p.playing ? "播放曲目后生效" : "吸附曲目调式"}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "relative h-5 w-9 rounded-full transition-ui",
            p.jam ? "bg-accent" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute left-0.5 top-0.5 size-4 rounded-full bg-foreground transition-transform duration-500 ease-spring",
              p.jam && "translate-x-4",
            )}
          />
        </span>
      </button>

      <button
        type="button"
        data-ocid="tracks.challenge.primary_button"
        onClick={p.onChallenge}
        className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full border border-primary/70 bg-primary/90 px-4 py-3 font-display text-sm font-bold tracking-[-0.01em] text-primary-foreground shadow-[0_0_32px_-8px_oklch(var(--primary)/0.9)] transition-ui hover:bg-primary hover:shadow-[0_0_44px_-6px_oklch(var(--primary))] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Swords className="size-4 transition-transform duration-500 ease-spring group-hover:-rotate-12 group-hover:scale-110" />
        共鸣挑战
        <span className="readout text-[9px] opacity-80">Challenge</span>
      </button>
    </section>
  );
}
