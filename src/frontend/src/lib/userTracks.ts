import type { PaletteId, ShapeId } from "./instrument";
import { ROOTS, type ScaleId, getScale, snapToScale } from "./scales";
import { STEPS_PER_BAR, type Track } from "./tracks";

export type Mode = "major" | "minor";

/** Derived, audio-free analysis of an uploaded song (the original audio is never stored). */
export interface SongAnalysis {
  bpm: number;
  root: number;
  mode: Mode;
  bars: number;
  duration: number;
  /** Per-bar 12-bin pitch-class profile, normalised to max 1. */
  barChroma: number[][];
  /** Dominant melody MIDI pitch per 16th step, null when unvoiced. */
  melody: (number | null)[];
  /** 16-step onset profiles per drum band, normalised to max 1. */
  drums: { kick: number[]; snare: number[]; hat: number[] };
}

export interface UserTrackRecord {
  id: string;
  name: string;
  fileName: string;
  createdAt: number;
  analysis: SongAnalysis;
  /** Current (user-adjustable) arrangement settings. */
  bpm: number;
  root: number;
  mode: Mode;
}

export interface UserArrangement {
  track: Track;
  density: number;
}

const KEY = "resonance.userTracks.v1";
export const MIN_BPM = 50;
export const MAX_BPM = 200;

const isNumArray = (v: unknown, len?: number): v is number[] =>
  Array.isArray(v) &&
  (len === undefined || v.length === len) &&
  v.every((x) => typeof x === "number" && Number.isFinite(x));

function isRecord(v: unknown): v is UserTrackRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  const a = r.analysis as Record<string, unknown> | undefined;
  if (
    typeof r.id !== "string" ||
    typeof r.name !== "string" ||
    typeof r.fileName !== "string" ||
    typeof r.createdAt !== "number" ||
    typeof r.bpm !== "number" ||
    typeof r.root !== "number" ||
    (r.mode !== "major" && r.mode !== "minor") ||
    !a ||
    typeof a !== "object"
  )
    return false;
  const bars = a.bars;
  const drums = a.drums as Record<string, unknown> | undefined;
  return (
    typeof bars === "number" &&
    bars >= 1 &&
    Array.isArray(a.barChroma) &&
    a.barChroma.length === bars &&
    a.barChroma.every((c) => isNumArray(c, 12)) &&
    Array.isArray(a.melody) &&
    a.melody.length === bars * STEPS_PER_BAR &&
    a.melody.every((m) => m === null || typeof m === "number") &&
    !!drums &&
    isNumArray(drums.kick, 16) &&
    isNumArray(drums.snare, 16) &&
    isNumArray(drums.hat, 16)
  );
}

export function loadUserTracks(): UserTrackRecord[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

/** Returns false when the browser refuses to persist (quota / private mode). */
export function saveUserTracks(list: UserTrackRecord[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function createRecord(
  analysis: SongAnalysis,
  fileName: string,
): UserTrackRecord {
  const stem = fileName.replace(/\.[^.]+$/, "").trim() || "未命名曲目";
  return {
    id: `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: stem.slice(0, 40),
    fileName,
    createdAt: Date.now(),
    analysis,
    bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(analysis.bpm))),
    root: analysis.root,
    mode: analysis.mode,
  };
}

function quality(iv: number[], d: number): "" | "m" | "°" {
  const at = (i: number) => iv[i % 7] + 12 * Math.floor(i / 7);
  const third = at(d + 2) - at(d);
  const fifth = at(d + 4) - at(d);
  if (third === 4) return "";
  return fifth === 6 ? "°" : "m";
}

export function chordLabel(
  root: number,
  scale: ScaleId,
  degree: number,
): string {
  const iv = getScale(scale).intervals;
  const d = ((degree % 7) + 7) % 7;
  return `${ROOTS[(root + iv[d]) % 12]}${quality(iv, d)}`;
}

export function modeLabel(mode: Mode): { zh: string; en: string } {
  return mode === "major"
    ? { zh: "大调", en: "Major" }
    : { zh: "小调", en: "Minor" };
}

function detectChords(
  barChroma: number[][],
  root: number,
  iv: number[],
): number[] {
  const out: number[] = [];
  let prev = 0;
  for (const c of barChroma) {
    const sum = c.reduce((s, v) => s + v, 0);
    if (sum < 0.5) {
      out.push(prev);
      continue;
    }
    let best = prev;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let d = 0; d < 7; d++) {
      const pcs = [0, 2, 4].map((o) => (root + iv[(d + o) % 7]) % 12);
      const tones = c[pcs[0]] + c[pcs[1]] * 0.85 + c[pcs[2]] * 0.9;
      const others = (sum - c[pcs[0]] - c[pcs[1]] - c[pcs[2]]) / 9;
      let score = tones - 0.35 * others;
      if (d === prev) score += 0.08;
      if (d === 0 || d === 3 || d === 4) score += 0.03;
      if (quality(iv, d) === "°") score -= 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    out.push(best);
    prev = best;
  }
  return out;
}

/** Top-ranked steps above a contrast threshold become hits. */
function drumPattern(
  profile: number[],
  limit: number,
  strong: number,
  soft: number,
): string {
  const mean = profile.reduce((s, v) => s + v, 0) / 16;
  const span = Math.max(1e-6, Math.max(...profile) - mean);
  const ranked = profile
    .map((v, s) => ({ s, c: (v - mean) / span }))
    .sort((a, b) => b.c - a.c)
    .slice(0, limit);
  const cells = new Array<string>(16).fill(".");
  for (const { s, c } of ranked)
    if (c >= soft) cells[s] = c >= strong ? "x" : "o";
  return cells.join("");
}

const DEGREE_CHARS = "0123456789abc";

function leadPhrases(
  rec: UserTrackRecord,
  scale: ScaleId,
): { lead: string[]; offset: number } {
  const iv = getScale(scale).intervals;
  const degrees = rec.analysis.melody.map((m) => {
    if (m === null) return null;
    const rel = snapToScale(m, rec.root, scale) - 60 - rec.root;
    const oct = Math.floor(rel / 12);
    return oct * iv.length + Math.max(0, iv.indexOf(rel - oct * 12));
  });
  const voiced = degrees
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b);
  const offset = (voiced[Math.floor(voiced.length / 2)] ?? 7) - 6;
  const lead: string[] = [];
  for (let bar = 0; bar < rec.analysis.bars; bar++) {
    let phrase = "";
    let last: number | null = null;
    let hold = 0;
    for (let s = 0; s < STEPS_PER_BAR; s++) {
      const d = degrees[bar * STEPS_PER_BAR + s];
      if (d === null || d === undefined) {
        phrase += ".";
        last = null;
        continue;
      }
      let c = d - offset;
      while (c < 0) c += iv.length;
      while (c > 12) c -= iv.length;
      if (c === last && hold < 4) {
        phrase += "-";
        hold++;
      } else {
        phrase += DEGREE_CHARS[c];
        hold = 1;
      }
      last = c;
    }
    lead.push(phrase);
  }
  return { lead, offset };
}

const cache = new WeakMap<UserTrackRecord, UserArrangement>();

/** Arrange a playable Track (drums, bass, pad chords, lead) from an analysis and its current settings. */
export function arrangeUserTrack(rec: UserTrackRecord): UserArrangement {
  const hit = cache.get(rec);
  if (hit) return hit;
  const scale: ScaleId = rec.mode;
  const iv = getScale(scale).intervals;
  const { drums } = rec.analysis;
  const kickCells = drumPattern(drums.kick, 6, 0.55, 0.25).split("");
  kickCells[0] = "x";
  const kick = kickCells.join("");
  let snare = drumPattern(drums.snare, 4, 0.6, 0.3);
  if (!snare.includes("x") && !snare.includes("o")) snare = "....x.......x...";
  const hat = drumPattern(drums.hat, 12, 0.6, 0.2);
  const bass = kickCells
    .map((k, s) => (k === "." ? "-" : k === "x" ? "x" : s % 2 ? "f" : "o"))
    .join("");
  const { lead, offset } = leadPhrases(rec, scale);
  const hits = (kick + snare + hat).replace(/\./g, "").length;
  const fast = rec.bpm >= 115;
  const palette: PaletteId =
    rec.mode === "major" ? (fast ? "sakura" : "gold") : fast ? "neon" : "ice";
  const shape: ShapeId =
    rec.bpm >= 128
      ? "galaxy"
      : rec.bpm >= 105
        ? "torus"
        : rec.mode === "major"
          ? "wave"
          : "sphere";
  const track: Track = {
    id: rec.id,
    zh: rec.name,
    en: `${ROOTS[rec.root]} ${modeLabel(rec.mode).en}`,
    styleZh: "我的曲目",
    styleEn: "My Upload",
    bpm: rec.bpm,
    root: rec.root,
    scale,
    palette,
    shape,
    leadWave: rec.mode === "major" ? "triangle" : "sawtooth",
    bassWave: fast ? "sawtooth" : "triangle",
    bars: rec.analysis.bars,
    introBars: 0,
    swing: 0,
    pad: true,
    cutoff: 2400,
    progression: detectChords(rec.analysis.barChroma, rec.root, iv),
    kick,
    snare,
    hat,
    bass,
    lead,
    leadAbs: offset,
    user: true,
  };
  const result = { track, density: hits / 48 };
  cache.set(rec, result);
  return result;
}

/** Consecutive identical bar chords merged into runs for display. */
export function chordRuns(
  track: Track,
): { degree: number; start: number; bars: number }[] {
  const runs: { degree: number; start: number; bars: number }[] = [];
  track.progression.forEach((degree, bar) => {
    const last = runs[runs.length - 1];
    if (last && last.degree === degree) last.bars++;
    else runs.push({ degree, start: bar, bars: 1 });
  });
  return runs;
}
