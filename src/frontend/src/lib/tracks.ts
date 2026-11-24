import type { PaletteId, ShapeId, Waveform } from "./instrument";
import { type ScaleId, degreeToMidi } from "./scales";

/**
 * Pattern notation (16 chars per bar):
 *  drums  x accent · o soft · O open hat · . rest
 *  bass   x chord root · o octave · f fifth · - hold · . rest
 *  lead   0-9 a-c scale degree above chord root · - hold · . rest
 */
export interface Track {
  id: string;
  zh: string;
  en: string;
  styleZh: string;
  styleEn: string;
  bpm: number;
  root: number;
  scale: ScaleId;
  palette: PaletteId;
  shape: ShapeId;
  leadWave: Waveform;
  bassWave: Waveform;
  bars: number;
  introBars: number;
  swing: number;
  pad: boolean;
  cutoff: number;
  progression: number[];
  kick: string;
  snare: string;
  hat: string;
  bass: string;
  lead: string[];
  /** When set, lead degrees are absolute from the tonic (offset by this many degrees) instead of chord-relative. */
  leadAbs?: number;
  /** Generated from an uploaded song. */
  user?: boolean;
}

export const TRACKS: Track[] = [
  {
    id: "abyssal-drift",
    zh: "深海漂流",
    en: "Abyssal Drift",
    styleZh: "氛围",
    styleEn: "Ambient",
    bpm: 76,
    root: 9,
    scale: "minor",
    palette: "ice",
    shape: "sphere",
    leadWave: "sine",
    bassWave: "sine",
    bars: 12,
    introBars: 1,
    swing: 0,
    pad: true,
    cutoff: 1800,
    progression: [0, 5, 3, 4],
    kick: "x.......x.......",
    snare: "............o...",
    hat: "..o...o...o...o.",
    bass: "x-------o-------",
    lead: [
      "4-------2---1---",
      "........3---2-0-",
      "7-------4---2---",
      "....5---4---2---",
    ],
  },
  {
    id: "neon-rain",
    zh: "霓虹雨",
    en: "Neon Rain",
    styleZh: "合成波",
    styleEn: "Synthwave",
    bpm: 104,
    root: 4,
    scale: "minor",
    palette: "neon",
    shape: "torus",
    leadWave: "sawtooth",
    bassWave: "sawtooth",
    bars: 16,
    introBars: 2,
    swing: 0,
    pad: true,
    cutoff: 2600,
    progression: [0, 5, 2, 6],
    kick: "x...x...x...x...",
    snare: "....x.......x...",
    hat: "o.x.o.x.o.x.o.x.",
    bass: "xoxoxoxoxoxoxoxo",
    lead: [
      "0-2-4---2-4-7---",
      "6-4-2---4-2-0---",
      "4---7---6-4-2-4-",
      "2-------0---....",
    ],
  },
  {
    id: "midnight-brew",
    zh: "午夜咖啡",
    en: "Midnight Brew",
    styleZh: "低保真",
    styleEn: "Lo-fi",
    bpm: 84,
    root: 2,
    scale: "dorian",
    palette: "gold",
    shape: "wave",
    leadWave: "triangle",
    bassWave: "triangle",
    bars: 12,
    introBars: 1,
    swing: 0.22,
    pad: true,
    cutoff: 1400,
    progression: [0, 3, 6, 4],
    kick: "x.....x...x.....",
    snare: "....x.......x..o",
    hat: "x.o.x.o.x.o.x.oo",
    bass: "x-....x...o-....",
    lead: [
      "2...4.2-0.......",
      "4-2-..1.0.......",
      "....6-4-2-4.....",
      "2-1-0-..........",
    ],
  },
  {
    id: "pulse-engine",
    zh: "脉冲引擎",
    en: "Pulse Engine",
    styleZh: "科技舞曲",
    styleEn: "Techno",
    bpm: 128,
    root: 7,
    scale: "minor",
    palette: "aurora",
    shape: "galaxy",
    leadWave: "square",
    bassWave: "sawtooth",
    bars: 16,
    introBars: 2,
    swing: 0,
    pad: false,
    cutoff: 2200,
    progression: [0, 0, 5, 3],
    kick: "x...x...x...x...",
    snare: "....o.......o...",
    hat: "o.O.o.O.o.O.o.O.",
    bass: ".xx..xx..xx..xf.",
    lead: [
      "0..0..4...0..7..",
      "0..0..4..2..0...",
      "7..7..4...4..2..",
      "0..2..4..2..0...",
    ],
  },
  {
    id: "stardust-arp",
    zh: "星尘琶音",
    en: "Stardust Arp",
    styleZh: "梦幻琶音",
    styleEn: "Dreamy Arp",
    bpm: 112,
    root: 2,
    scale: "major",
    palette: "sakura",
    shape: "sphere",
    leadWave: "triangle",
    bassWave: "sine",
    bars: 16,
    introBars: 1,
    swing: 0,
    pad: true,
    cutoff: 3600,
    progression: [0, 4, 5, 3],
    kick: "x.......x.......",
    snare: "........o.......",
    hat: "..o...o...o...o.",
    bass: "x-------f-------",
    lead: ["0247424702474247", "247b9742247b9742"],
  },
  {
    id: "cloud-pagoda",
    zh: "云间古韵",
    en: "Cloud Pagoda",
    styleZh: "东方五声",
    styleEn: "Oriental",
    bpm: 92,
    root: 7,
    scale: "majorPenta",
    palette: "ember",
    shape: "wave",
    leadWave: "triangle",
    bassWave: "sine",
    bars: 16,
    introBars: 1,
    swing: 0,
    pad: true,
    cutoff: 2400,
    progression: [0, 3, 4, 0],
    kick: "x.....x.x.......",
    snare: "........x.......",
    hat: ".o.o.o.o.o.o.o.o",
    bass: "x---.o..x---.o..",
    lead: [
      "4-3-2-1-0---1-2-",
      "3-4-5---4-3-2---",
      "5-7-5-4-3---2-3-",
      "1-------0-------",
    ],
  },
];

export const STEPS_PER_BAR = 16;

export function stepDuration(track: Track): number {
  return 60 / track.bpm / 4;
}

export function trackSteps(track: Track): number {
  return track.bars * STEPS_PER_BAR;
}

export function trackDuration(track: Track): number {
  return trackSteps(track) * stepDuration(track);
}

/** Swing-adjusted offset (seconds) of a global step from song start. */
export function stepTime(track: Track, step: number): number {
  const d = stepDuration(track);
  return step * d + (step % 2 === 1 ? track.swing * d : 0);
}

export function chordDegree(track: Track, bar: number): number {
  return track.progression[bar % track.progression.length];
}

function degreeChar(c: string): number | null {
  if (c >= "0" && c <= "9") return Number(c);
  if (c >= "a" && c <= "c") return 10 + c.charCodeAt(0) - 97;
  return null;
}

/** Lead note starting at a global step, with its length in steps. */
export function leadAt(
  track: Track,
  step: number,
): { midi: number; len: number } | null {
  const bar = Math.floor(step / STEPS_PER_BAR);
  if (bar < track.introBars) return null;
  const s = step % STEPS_PER_BAR;
  const phrase = track.lead[(bar - track.introBars) % track.lead.length];
  const deg = degreeChar(phrase[s]);
  if (deg === null) return null;
  let len = 1;
  while (s + len < STEPS_PER_BAR && phrase[s + len] === "-") len++;
  return {
    midi:
      track.leadAbs !== undefined
        ? degreeToMidi(deg + track.leadAbs, track.root, track.scale, 60)
        : degreeToMidi(
            chordDegree(track, bar) + deg,
            track.root,
            track.scale,
            72,
          ),
    len,
  };
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface ChartNote {
  id: number;
  step: number;
  time: number;
  midi: number;
}

/** Rhythm-challenge targets: lead onsets plus accented kicks, thinned to a playable gap. */
export function buildChart(track: Track): ChartNote[] {
  const minGap = Math.max(2, Math.ceil(0.42 / stepDuration(track)));
  const out: ChartNote[] = [];
  let last = -minGap;
  const total = trackSteps(track) - 2;
  for (let step = STEPS_PER_BAR; step < total; step++) {
    const lead = leadAt(track, step);
    const kick = track.kick[step % STEPS_PER_BAR] === "x";
    if (!lead && !kick) continue;
    if (step - last < minGap) continue;
    last = step;
    const bar = Math.floor(step / STEPS_PER_BAR);
    out.push({
      id: out.length,
      step,
      time: stepTime(track, step),
      midi:
        lead?.midi ??
        degreeToMidi(chordDegree(track, bar), track.root, track.scale, 72),
    });
  }
  return out;
}
