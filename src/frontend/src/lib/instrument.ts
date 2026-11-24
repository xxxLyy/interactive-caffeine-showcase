export type ShapeId = "sphere" | "torus" | "galaxy" | "wave";
export type PaletteId = "neon" | "gold" | "aurora" | "ice" | "ember" | "sakura";
export type Waveform = "sine" | "triangle" | "sawtooth" | "square";
export type KnobId = "cutoff" | "resonance" | "reverb" | "delay";
export type KnobValues = Record<KnobId, number>;

export interface PaletteColors {
  a: string;
  b: string;
  glowA: string;
  glowB: string;
  base: string;
}

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function midiToName(midi: number): string {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function isBlackKey(midi: number): boolean {
  return NOTE_NAMES[midi % 12].includes("#");
}

/** Two octaves C4 – C6 */
export const KEY_LOW = 60;
export const KEY_HIGH = 84;

/** event.code → semitone offset from C4. Shift adds one octave. */
export const KEY_MAP: Record<string, number> = {
  KeyA: 0,
  KeyW: 1,
  KeyS: 2,
  KeyE: 3,
  KeyD: 4,
  KeyF: 5,
  KeyT: 6,
  KeyG: 7,
  KeyY: 8,
  KeyH: 9,
  KeyU: 10,
  KeyJ: 11,
  KeyK: 12,
  KeyO: 13,
  KeyL: 14,
  KeyP: 15,
  Semicolon: 16,
  Quote: 17,
};

export const KEY_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(KEY_MAP).map(([code, off]) => [
    KEY_LOW + off,
    code === "Semicolon"
      ? ";"
      : code === "Quote"
        ? "'"
        : code.replace("Key", ""),
  ]),
);

/** Sequencer rows, top (high) → bottom (low): C minor pentatonic */
export const SEQ_PITCHES = [72, 70, 67, 65, 63, 60, 58, 55];
export const SEQ_STEPS = 16;

export function emptyGrid(): boolean[][] {
  return SEQ_PITCHES.map(() => Array.from({ length: SEQ_STEPS }, () => false));
}

export function defaultGrid(): boolean[][] {
  const g = emptyGrid();
  const hits: Array<[number, number]> = [
    [5, 0],
    [3, 3],
    [2, 6],
    [5, 8],
    [1, 10],
    [3, 12],
    [0, 14],
    [7, 4],
    [6, 11],
  ];
  for (const [r, s] of hits) g[r][s] = true;
  return g;
}

export function randomGrid(): boolean[][] {
  return SEQ_PITCHES.map((_, r) =>
    Array.from({ length: SEQ_STEPS }, (_, s) => {
      const downbeat = s % 4 === 0 ? 0.12 : 0;
      const density = r >= 5 ? 0.16 : 0.1;
      return Math.random() < density + downbeat;
    }),
  );
}

export type DrumId = "kick" | "snare" | "hat";
export const DRUM_ROWS: Array<{ id: DrumId; zh: string; en: string }> = [
  { id: "kick", zh: "底鼓", en: "Kick" },
  { id: "snare", zh: "军鼓", en: "Snare" },
  { id: "hat", zh: "踩镲", en: "Hi-Hat" },
];

export function emptyDrums(): boolean[][] {
  return DRUM_ROWS.map(() => Array.from({ length: SEQ_STEPS }, () => false));
}

export function defaultDrums(): boolean[][] {
  return [
    Array.from({ length: SEQ_STEPS }, (_, s) => s % 8 === 0 || s === 11),
    Array.from({ length: SEQ_STEPS }, (_, s) => s % 8 === 4),
    Array.from({ length: SEQ_STEPS }, (_, s) => s % 2 === 0),
  ];
}

export function randomDrums(): boolean[][] {
  return [
    Array.from(
      { length: SEQ_STEPS },
      (_, s) => s % 8 === 0 || Math.random() < 0.12,
    ),
    Array.from(
      { length: SEQ_STEPS },
      (_, s) => s % 8 === 4 || Math.random() < 0.06,
    ),
    Array.from({ length: SEQ_STEPS }, (_, s) =>
      s % 2 === 0 ? Math.random() < 0.85 : Math.random() < 0.3,
    ),
  ];
}

export const SHAPES: Array<{ id: ShapeId; zh: string; en: string }> = [
  { id: "sphere", zh: "球体", en: "Sphere" },
  { id: "torus", zh: "环面", en: "Torus" },
  { id: "galaxy", zh: "星系", en: "Galaxy" },
  { id: "wave", zh: "波浪", en: "Wave" },
];

export const PALETTES: Array<{
  id: PaletteId;
  zh: string;
  en: string;
  colors: PaletteColors;
}> = [
  {
    id: "neon",
    zh: "霓虹",
    en: "Neon",
    colors: {
      a: "#ff2f9a",
      b: "#3fe0f2",
      glowA: "#4a0a3c",
      glowB: "#062a52",
      base: "#0b0914",
    },
  },
  {
    id: "gold",
    zh: "熔金",
    en: "Gold",
    colors: {
      a: "#f5b43c",
      b: "#f0602a",
      glowA: "#4d2405",
      glowB: "#33110d",
      base: "#0d0a0b",
    },
  },
  {
    id: "aurora",
    zh: "极光",
    en: "Aurora",
    colors: {
      a: "#3ff09a",
      b: "#9a8cff",
      glowA: "#003a28",
      glowB: "#1c1852",
      base: "#080c12",
    },
  },
  {
    id: "ice",
    zh: "冰蓝",
    en: "Ice",
    colors: {
      a: "#cfeaf8",
      b: "#7fb0e0",
      glowA: "#16293a",
      glowB: "#111826",
      base: "#080b12",
    },
  },
  {
    id: "ember",
    zh: "余烬",
    en: "Ember",
    colors: {
      a: "#ff5a3c",
      b: "#f2d24a",
      glowA: "#4a120a",
      glowB: "#2e2008",
      base: "#0d0908",
    },
  },
  {
    id: "sakura",
    zh: "樱花",
    en: "Sakura",
    colors: {
      a: "#f7a8c8",
      b: "#7fe8d8",
      glowA: "#3d1428",
      glowB: "#0c2c2a",
      base: "#0c0a10",
    },
  },
];

export const WAVEFORMS: Array<{ id: Waveform; zh: string; en: string }> = [
  { id: "sine", zh: "正弦", en: "Sine" },
  { id: "triangle", zh: "三角", en: "Triangle" },
  { id: "sawtooth", zh: "锯齿", en: "Saw" },
  { id: "square", zh: "方波", en: "Square" },
];

export const KNOBS: Array<{ id: KnobId; zh: string; en: string }> = [
  { id: "cutoff", zh: "滤波", en: "Cutoff" },
  { id: "resonance", zh: "共鸣", en: "Resonance" },
  { id: "reverb", zh: "混响", en: "Reverb" },
  { id: "delay", zh: "延迟", en: "Delay" },
];

export interface Preset {
  id: string;
  zh: string;
  en: string;
  waveform: Waveform;
  knobs: KnobValues;
  shape: ShapeId;
  palette: PaletteId;
}

export const PRESETS: Preset[] = [
  {
    id: "deep-space",
    zh: "深空",
    en: "Deep Space",
    waveform: "sine",
    knobs: { cutoff: 42, resonance: 24, reverb: 84, delay: 48 },
    shape: "galaxy",
    palette: "neon",
  },
  {
    id: "magma",
    zh: "熔岩",
    en: "Magma",
    waveform: "sawtooth",
    knobs: { cutoff: 62, resonance: 64, reverb: 30, delay: 22 },
    shape: "torus",
    palette: "gold",
  },
  {
    id: "borealis",
    zh: "极光",
    en: "Borealis",
    waveform: "triangle",
    knobs: { cutoff: 74, resonance: 34, reverb: 70, delay: 62 },
    shape: "wave",
    palette: "aurora",
  },
  {
    id: "crystal",
    zh: "晶体",
    en: "Crystal",
    waveform: "square",
    knobs: { cutoff: 90, resonance: 72, reverb: 54, delay: 34 },
    shape: "sphere",
    palette: "ice",
  },
];

export const INITIAL_KNOBS: KnobValues = {
  cutoff: 74,
  resonance: 42,
  reverb: 68,
  delay: 15,
};

export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t);
}

export function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
}
