const KEY = "resonance.best.v1";

export type BestScores = Record<string, number>;

export function loadBest(): BestScores {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    const out: BestScores = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>))
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function saveBest(scores: BestScores): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    // storage unavailable (private mode); best stays in memory for this session
  }
}

export type Judgement = "perfect" | "good" | "miss";

export const PERFECT_WINDOW = 0.07;
export const GOOD_WINDOW = 0.16;

export function judgeOffset(dt: number): Judgement {
  const a = Math.abs(dt);
  if (a <= PERFECT_WINDOW) return "perfect";
  if (a <= GOOD_WINDOW) return "good";
  return "miss";
}

export function comboMultiplier(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 10));
}

export function accuracyOf(perfect: number, good: number, total: number) {
  return total === 0 ? 0 : ((perfect + good * 0.6) / total) * 100;
}

export type Rank = "S" | "A" | "B" | "C";

export function rankOf(accuracy: number): Rank {
  if (accuracy >= 92) return "S";
  if (accuracy >= 80) return "A";
  if (accuracy >= 60) return "B";
  return "C";
}
