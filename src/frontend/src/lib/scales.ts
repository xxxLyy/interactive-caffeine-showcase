export type ScaleId =
  | "minorPenta"
  | "majorPenta"
  | "major"
  | "minor"
  | "dorian"
  | "inSen"
  | "chromatic";

export interface ScaleDef {
  id: ScaleId;
  zh: string;
  en: string;
  intervals: number[];
}

export const ROOTS = [
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

export const SCALES: ScaleDef[] = [
  {
    id: "minorPenta",
    zh: "小调五声",
    en: "Minor Penta",
    intervals: [0, 3, 5, 7, 10],
  },
  {
    id: "majorPenta",
    zh: "大调五声",
    en: "Major Penta",
    intervals: [0, 2, 4, 7, 9],
  },
  { id: "major", zh: "大调", en: "Major", intervals: [0, 2, 4, 5, 7, 9, 11] },
  {
    id: "minor",
    zh: "自然小调",
    en: "Nat. Minor",
    intervals: [0, 2, 3, 5, 7, 8, 10],
  },
  {
    id: "dorian",
    zh: "多利亚",
    en: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
  },
  { id: "inSen", zh: "日本阴旋", en: "In-Sen", intervals: [0, 1, 5, 7, 10] },
  {
    id: "chromatic",
    zh: "半音阶",
    en: "Chromatic",
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
];

export function getScale(id: ScaleId): ScaleDef {
  return SCALES.find((s) => s.id === id) ?? SCALES[0];
}

export function inScale(midi: number, root: number, scale: ScaleId): boolean {
  const pc = (((midi - root) % 12) + 12) % 12;
  return getScale(scale).intervals.includes(pc);
}

/** Nearest in-scale pitch; ties resolve downward. */
export function snapToScale(
  midi: number,
  root: number,
  scale: ScaleId,
): number {
  for (let d = 0; d < 7; d++) {
    if (inScale(midi - d, root, scale)) return midi - d;
    if (inScale(midi + d, root, scale)) return midi + d;
  }
  return midi;
}

/** Scale degree (can exceed scale length or be negative) → MIDI, from `base` octave C. */
export function degreeToMidi(
  degree: number,
  root: number,
  scale: ScaleId,
  base = 60,
): number {
  const iv = getScale(scale).intervals;
  const oct = Math.floor(degree / iv.length);
  const idx = ((degree % iv.length) + iv.length) % iv.length;
  return base + root + oct * 12 + iv[idx];
}

/** Eight sequencer rows top (high) → bottom (low), anchored near C4. */
export function sequencerPitches(root: number, scale: ScaleId): number[] {
  const len = getScale(scale).intervals.length;
  const startDeg = len >= 7 ? -2 : len === 5 ? -2 : -3;
  const base = root > 6 ? 48 : 60;
  return Array.from({ length: 8 }, (_, i) =>
    degreeToMidi(startDeg + 7 - i, root, scale, base),
  );
}
