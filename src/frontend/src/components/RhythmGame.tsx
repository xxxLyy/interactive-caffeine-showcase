import type { AudioEngine } from "@/audio/engine";
import type { SongPlayer } from "@/audio/song";
import {
  GOOD_WINDOW,
  type Judgement,
  accuracyOf,
  comboMultiplier,
  judgeOffset,
  rankOf,
} from "@/lib/game";
import { KEY_MAP } from "@/lib/instrument";
import {
  type ChartNote,
  type Track,
  buildChart,
  trackDuration,
} from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameResults, type RunStats } from "./GameResults";

const APPROACH = 1.25;
const POINTS: Record<Judgement, number> = { perfect: 300, good: 120, miss: 0 };
const JUDGE_TEXT: Record<Judgement, string> = {
  perfect: "PERFECT",
  good: "GOOD",
  miss: "MISS",
};

interface Orb {
  note: ChartNote;
  x: number;
  y: number;
}
interface Pop {
  id: number;
  kind: Judgement;
  x: number;
  y: number;
}
type Phase = "countdown" | "playing" | "paused" | "results";

interface RhythmGameProps {
  engine: AudioEngine;
  song: SongPlayer;
  track: Track;
  best: number;
  onBurst: (clientX: number, clientY: number) => void;
  onRecord: (score: number) => void;
  onExit: () => void;
  onChooseTrack: () => void;
}

function placeOrb(note: ChartNote): Orb {
  const a = note.id * 2.39996;
  const r = 0.35 + ((note.id * 7) % 5) / 6.5;
  return {
    note,
    x: Math.min(84, Math.max(16, 50 + Math.cos(a) * r * 34)),
    y: Math.min(72, Math.max(22, 47 + Math.sin(a) * r * 26)),
  };
}

/** 共鸣挑战: timed orbs over the particle field, judged against the song's audio clock. */
export function RhythmGame(props: RhythmGameProps) {
  const { engine, song, track, onBurst, onRecord, onExit, onChooseTrack } =
    props;
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("countdown");
  const [count, setCount] = useState(3);
  const [orbs, setOrbs] = useState<Orb[]>([]);
  const [pops, setPops] = useState<Pop[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [stats, setStats] = useState<RunStats | null>(null);
  const bestAtStart = useRef(props.best);
  const live = useRef<Orb[]>([]);
  const tally = useRef({
    score: 0,
    combo: 0,
    max: 0,
    perfect: 0,
    good: 0,
    miss: 0,
  });
  const chart = useRef<ChartNote[]>([]);
  const nextRef = useRef(0);
  const finishRef = useRef<() => void>(() => {});
  const progressRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const judge = useCallback(
    (orb: Orb, kind: Judgement) => {
      live.current = live.current.filter((o) => o !== orb);
      setOrbs(live.current);
      const t = tally.current;
      if (kind === "miss") {
        t.combo = 0;
        t.miss++;
      } else {
        t.combo++;
        t.max = Math.max(t.max, t.combo);
        t[kind]++;
        t.score += POINTS[kind] * comboMultiplier(t.combo - 1);
        engine.pluck(orb.note.midi + 12, kind === "perfect" ? 1 : 0.8);
        const rect = hostRef.current?.getBoundingClientRect();
        if (rect)
          onBurst(
            rect.left + (orb.x / 100) * rect.width,
            rect.top + (orb.y / 100) * rect.height,
          );
      }
      setScore(t.score);
      setCombo(t.combo);
      setPops((p) => [
        ...p.slice(-5),
        { id: performance.now() + Math.random(), kind, x: orb.x, y: orb.y },
      ]);
    },
    [engine, onBurst],
  );

  const hit = useCallback(
    (orb: Orb) => {
      const dt = song.position() - orb.note.time;
      if (dt < -GOOD_WINDOW * 2.2) return;
      judge(orb, judgeOffset(dt));
    },
    [song, judge],
  );

  const finish = useCallback(() => {
    for (const o of [...live.current]) judge(o, "miss");
    const t = tally.current;
    const accuracy = accuracyOf(t.perfect, t.good, chart.current.length);
    setStats({
      score: t.score,
      maxCombo: t.max,
      accuracy,
      rank: rankOf(accuracy),
      perfect: t.perfect,
      good: t.good,
      miss: t.miss,
    });
    onRecord(t.score);
    setPhase("results");
  }, [judge, onRecord]);

  // Run setup + 3-2-1 count-in (re-runs on retry)
  useEffect(() => {
    void run;
    const prevEnd = song.onEnd;
    const prevLoop = song.loop;
    song.load(track);
    song.loop = false;
    song.onEnd = () => finishRef.current();
    chart.current = buildChart(track);
    nextRef.current = 0;
    live.current = [];
    tally.current = {
      score: 0,
      combo: 0,
      max: 0,
      perfect: 0,
      good: 0,
      miss: 0,
    };
    setOrbs([]);
    setPops([]);
    setScore(0);
    setCombo(0);
    setStats(null);
    setPhase("countdown");
    setCount(3);
    const timers = [1, 2, 3].map((n) =>
      window.setTimeout(() => {
        if (n < 3) {
          setCount(3 - n);
          return;
        }
        setPhase("playing");
        song.play();
      }, n * 800),
    );
    return () => {
      for (const id of timers) window.clearTimeout(id);
      song.onEnd = prevEnd;
      song.loop = prevLoop;
    };
  }, [run, song, track]);

  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  // Spawn + auto-miss loop on the audio clock
  useEffect(() => {
    if (phase !== "playing") return;
    let raf = 0;
    const dur = trackDuration(track);
    const tick = () => {
      const t = song.position();
      let changed = false;
      const list = chart.current;
      while (
        nextRef.current < list.length &&
        list[nextRef.current].time - APPROACH <= t
      ) {
        live.current = [...live.current, placeOrb(list[nextRef.current])];
        nextRef.current++;
        changed = true;
      }
      if (changed) setOrbs(live.current);
      for (const o of live.current)
        if (t - o.note.time > GOOD_WINDOW) judge(o, "miss");
      if (progressRef.current)
        progressRef.current.style.transform = `scaleX(${Math.min(1, t / dur)})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, song, track, judge]);

  const togglePause = useCallback(() => {
    const ctx = engine.ctx;
    if (!ctx) return;
    if (phase === "playing") {
      void ctx.suspend();
      setPhase("paused");
    } else if (phase === "paused") {
      void ctx.resume();
      setPhase("playing");
    }
  }, [engine, phase]);

  const quit = useCallback(() => {
    song.stop();
    void engine.ctx?.resume();
    onExit();
  }, [song, engine, onExit]);

  // Keyboard: any instrument key / Space hits the earliest orb, Esc pauses
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === "Escape") {
        togglePause();
        return;
      }
      if (phase !== "playing") return;
      if (e.code !== "Space" && KEY_MAP[e.code] === undefined) return;
      e.preventDefault();
      const first = live.current.reduce<Orb | null>(
        (m, o) => (!m || o.note.time < m.note.time ? o : m),
        null,
      );
      if (first) hit(first);
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [phase, hit, togglePause]);

  const mult = comboMultiplier(combo);

  return (
    <div
      className={cn(
        "fixed inset-0 z-40 select-none",
        phase === "paused" && "[&_*]:[animation-play-state:paused]",
      )}
      data-ocid="game.panel"
    >
      <div className="scrim-game pointer-events-none absolute inset-0 opacity-60" />
      <div ref={hostRef} className="pointer-events-none absolute inset-0">
        {orbs.map((o) => (
          <div
            key={o.note.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${o.x}%`, top: `${o.y}%` }}
          >
            <button
              type="button"
              aria-label="命中光球 Hit orb"
              data-ocid={`game.orb.${o.note.id + 1}`}
              onPointerDown={(e) => {
                e.preventDefault();
                hit(o);
              }}
              onClick={(e) => {
                if (e.detail === 0) hit(o);
              }}
              className="pointer-events-auto relative grid size-[72px] touch-none place-items-center rounded-full animate-fade-up [animation-duration:300ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:size-16"
            >
              <span className="glass absolute inset-1.5 rounded-full border-accent/60 shadow-ring-halo transition-transform duration-200 ease-out-expo hover:scale-105" />
              <span className="absolute inset-[38%] rounded-full bg-accent/80 shadow-[0_0_18px_oklch(var(--accent))]" />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border-2 border-accent animate-ring-shrink"
                style={{ ["--ring-duration" as string]: `${APPROACH}s` }}
              />
            </button>
          </div>
        ))}
        {pops.map((p) => (
          <div
            key={p.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              onAnimationEnd={() =>
                setPops((all) => all.filter((x) => x.id !== p.id))
              }
              className={cn(
                "block whitespace-nowrap font-display font-bold italic tracking-[-0.04em] animate-judge-pop",
                p.kind === "perfect" &&
                  "text-judge-perfect text-4xl md:text-5xl",
                p.kind === "good" && "text-judge-good text-3xl",
                p.kind === "miss" && "text-judge-miss text-2xl",
              )}
            >
              {JUDGE_TEXT[p.kind]}
            </span>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4 md:p-6">
        <div className="h-[2px] w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            ref={progressRef}
            className="progress-hairline h-full origin-left"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="readout truncate text-[9px] text-muted-foreground">
              共鸣挑战 · {track.zh} {track.en}
            </p>
            <p
              className="font-display text-5xl font-bold leading-none tracking-[-0.05em] text-foreground tabular-nums md:text-7xl"
              data-ocid="game.score"
            >
              {score.toLocaleString()}
            </p>
            <p className="readout text-[9px] text-muted-foreground">
              Score 得分
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex gap-1.5">
              <button
                type="button"
                aria-label={phase === "paused" ? "继续 Resume" : "暂停 Pause"}
                data-ocid="game.pause.toggle"
                disabled={phase !== "playing" && phase !== "paused"}
                onClick={togglePause}
                className="glass grid size-11 place-items-center rounded-full text-foreground transition-ui hover:border-primary/50 active:scale-90 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {phase === "paused" ? (
                  <Play className="size-4" />
                ) : (
                  <Pause className="size-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="退出挑战 Quit"
                data-ocid="game.close_button"
                onClick={quit}
                className="glass grid size-11 place-items-center rounded-full text-foreground transition-ui hover:border-destructive/60 hover:text-destructive active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" />
              </button>
            </div>
            <p
              key={combo}
              className={cn(
                "font-display text-4xl font-light leading-none tracking-[-0.04em] tabular-nums md:text-6xl",
                combo > 0
                  ? "text-stroke-primary animate-combo-bump"
                  : "text-stroke",
              )}
              data-ocid="game.combo"
            >
              ×{combo}
            </p>
            <p className="readout text-[9px] text-muted-foreground">
              Combo 连击 · <span className="text-accent">倍率 ×{mult}</span>
            </p>
          </div>
        </div>
      </div>

      {phase === "countdown" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span
            key={count}
            className="font-display text-[34vmin] font-bold leading-none tracking-[-0.06em] text-foreground animate-count-in"
            data-ocid="game.countdown.loading_state"
          >
            {count}
          </span>
        </div>
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm">
          <div
            className="flex flex-col items-center gap-4"
            data-ocid="game.paused.dialog"
          >
            <p className="font-display text-5xl font-bold tracking-[-0.05em]">
              暂停{" "}
              <span className="font-serif-italic font-normal text-primary">
                Paused
              </span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                data-ocid="game.resume.primary_button"
                onClick={togglePause}
                className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-ui active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Play className="size-4" /> 继续
              </button>
              <button
                type="button"
                data-ocid="game.quit.cancel_button"
                onClick={quit}
                className="hairline flex h-11 items-center gap-1.5 rounded-full border px-6 text-sm transition-ui hover:bg-foreground/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-4" /> 退出
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "results" && stats && (
        <div className="absolute inset-0 grid place-items-center bg-background/55 backdrop-blur-sm">
          <GameResults
            track={track}
            stats={stats}
            best={Math.max(bestAtStart.current, stats.score)}
            isRecord={stats.score > bestAtStart.current && stats.score > 0}
            onRetry={() => {
              bestAtStart.current = Math.max(bestAtStart.current, stats.score);
              setRun((r) => r + 1);
            }}
            onChoose={() => {
              song.stop();
              onChooseTrack();
            }}
          />
        </div>
      )}
    </div>
  );
}
