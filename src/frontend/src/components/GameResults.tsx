import type { Rank } from "@/lib/game";
import type { Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { ListMusic, RotateCcw, Sparkles, Trophy } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

export interface RunStats {
  score: number;
  maxCombo: number;
  accuracy: number;
  rank: Rank;
  perfect: number;
  good: number;
  miss: number;
}

interface GameResultsProps {
  track: Track;
  stats: RunStats;
  best: number;
  isRecord: boolean;
  onRetry: () => void;
  onChoose: () => void;
}

const RANK_CLASS: Record<Rank, string> = {
  S: "text-rank-s",
  A: "text-rank-a",
  B: "text-rank-b",
  C: "text-rank-c",
};

/** End-of-run screen: rank slam, score, combo, accuracy, best and record flare. */
export function GameResults({
  track,
  stats,
  best,
  isRecord,
  onRetry,
  onChoose,
}: GameResultsProps) {
  const reduce = useReducedMotion();
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => retryRef.current?.focus(), []);

  const rows = [
    { zh: "最高连击", en: "Max Combo", value: `×${stats.maxCombo}` },
    { zh: "命中率", en: "Accuracy", value: `${stats.accuracy.toFixed(1)}%` },
    {
      zh: "判定",
      en: "P / G / M",
      value: `${stats.perfect} / ${stats.good} / ${stats.miss}`,
    },
  ];

  return (
    <motion.section
      aria-label="挑战结果 Results"
      data-ocid="game.results.dialog"
      className="glass relative w-[min(92vw,420px)] rounded-xl p-6 shadow-elevated"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <p className="readout text-[9px] text-muted-foreground">
        Results · 挑战结果
      </p>
      <p className="mt-1 truncate font-display text-lg font-bold tracking-[-0.03em] text-foreground">
        {track.zh}{" "}
        <span className="font-serif-italic text-base font-normal text-muted-foreground">
          {track.en}
        </span>
      </p>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="readout text-[9px] text-muted-foreground">Score 得分</p>
          <p
            className="font-display text-5xl font-bold leading-none tracking-[-0.05em] text-foreground tabular-nums"
            data-ocid="game.results.score"
          >
            {stats.score.toLocaleString()}
          </p>
        </div>
        <span
          className={cn(
            "font-display text-8xl font-bold leading-[0.8] tracking-[-0.06em] animate-rank-slam",
            RANK_CLASS[stats.rank],
          )}
          data-ocid="game.results.rank"
          aria-label={`评级 Rank ${stats.rank}`}
        >
          {stats.rank}
        </span>
      </div>

      {isRecord ? (
        <div
          className="mt-4 flex items-center gap-2 rounded-md border border-primary/60 bg-primary/15 px-3 py-2 text-sm text-rank-s shadow-[0_0_32px_-8px_oklch(var(--primary)/0.9)] animate-combo-bump [animation-iteration-count:3]"
          data-ocid="game.results.record.success_state"
        >
          <Sparkles className="size-4" />
          新纪录！<span className="readout text-[9px]">New Record</span>
        </div>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Trophy className="size-3.5 text-rank-s" />
          最佳 Best
          <span className="readout text-foreground">
            {best.toLocaleString()}
          </span>
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-foreground/[0.08] pt-4">
        {rows.map((r) => (
          <div key={r.en} className="min-w-0">
            <dt className="text-[10px] text-muted-foreground">
              {r.zh} <span className="readout block text-[8px]">{r.en}</span>
            </dt>
            <dd className="mt-1 truncate font-mono text-sm text-foreground">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <button
          ref={retryRef}
          type="button"
          data-ocid="game.results.retry_button"
          onClick={onRetry}
          className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-primary/70 bg-primary text-sm font-medium text-primary-foreground transition-ui hover:shadow-[0_0_32px_-6px_oklch(var(--primary))] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <RotateCcw className="size-4" /> 再来一次
        </button>
        <button
          type="button"
          data-ocid="game.results.secondary_button"
          onClick={onChoose}
          className="hairline flex h-11 items-center justify-center gap-1.5 rounded-full border text-sm text-foreground transition-ui hover:border-primary/40 hover:bg-primary/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ListMusic className="size-4" /> 换一首
        </button>
      </div>
    </motion.section>
  );
}
