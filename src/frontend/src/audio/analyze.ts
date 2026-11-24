import { Fft } from "@/lib/fft";
import type { SongAnalysis } from "@/lib/userTracks";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export const MIN_SECONDS = 10;
const MAX_SECONDS = 300;
const MAX_BARS = 128;
const SR = 11025;
const MEL_LOW = 55;
const MEL_COUNT = 30;
const STAGE_MIN_MS = 340;

export const ANALYSIS_STAGES = [
  { id: "decode", zh: "解码", en: "Decode" },
  { id: "beat", zh: "节拍", en: "Beat" },
  { id: "key", zh: "调性", en: "Key" },
  { id: "chord", zh: "和弦", en: "Chord" },
  { id: "melody", zh: "旋律", en: "Melody" },
] as const;

export type AnalysisErrorKind = "format" | "size" | "decode" | "short" | "beat";

const MESSAGES: Record<AnalysisErrorKind, string> = {
  format: "不支持的文件格式。请选择 MP3、WAV、M4A 或 OGG 音频文件。",
  size: "文件超过 20MB 上限，请选择更小的音频文件。",
  decode: "无法解码这个文件，它可能已损坏，或者编码不被当前浏览器支持。",
  short: "音频太短（不足 10 秒），至少需要 10 秒才能识别节拍与和弦。",
  beat: "没有找到清晰的节拍。请换一首节奏更明显的歌曲再试。",
};

export class AnalysisError extends Error {
  kind: AnalysisErrorKind;
  constructor(kind: AnalysisErrorKind) {
    super(MESSAGES[kind]);
    this.kind = kind;
  }
}

const EXTENSIONS = ["mp3", "wav", "m4a", "ogg", "oga"];
const MIME =
  /^audio\/(mpeg|mp3|wav|x-wav|wave|vnd\.wave|mp4|x-m4a|m4a|aac|ogg|vorbis|opus)$/;
export const ACCEPT =
  ".mp3,.wav,.m4a,.ogg,.oga,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/ogg";

export function validateFile(file: File): void {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!EXTENSIONS.includes(ext) && !MIME.test(file.type))
    throw new AnalysisError("format");
  if (file.size > MAX_UPLOAD_BYTES) throw new AnalysisError("size");
  if (file.size === 0) throw new AnalysisError("decode");
}

const abortError = () => new DOMException("Analysis cancelled", "AbortError");

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const onAbort = () => {
      window.clearTimeout(t);
      reject(abortError());
    };
    const t = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export interface AnalyzeOptions {
  signal: AbortSignal;
  onProgress: (stage: number, progress: number) => void;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

async function decode(
  file: File,
  signal: AbortSignal,
  report: (p: number) => void,
) {
  const bytes = await file.arrayBuffer();
  if (signal.aborted) throw abortError();
  report(0.3);
  let audio: AudioBuffer;
  try {
    audio = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes);
  } catch {
    throw new AnalysisError("decode");
  }
  if (signal.aborted) throw abortError();
  if (!Number.isFinite(audio.duration) || audio.length === 0)
    throw new AnalysisError("decode");
  if (audio.duration < MIN_SECONDS) throw new AnalysisError("short");
  report(0.7);
  const seconds = Math.min(audio.duration, MAX_SECONDS);
  const off = new OfflineAudioContext(1, Math.ceil(seconds * SR), SR);
  const src = off.createBufferSource();
  src.buffer = audio;
  src.connect(off.destination);
  src.start();
  const rendered = await off.startRendering();
  if (signal.aborted) throw abortError();
  const samples = rendered.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < samples.length; i++)
    peak = Math.max(peak, Math.abs(samples[i]));
  if (peak < 0.005) throw new AnalysisError("beat");
  for (let i = 0; i < samples.length; i++) samples[i] /= peak;
  return { samples, duration: seconds };
}

/** Three-band spectral flux (low/mid/high) at ~86 fps. */
async function onsetBands(
  samples: Float32Array,
  signal: AbortSignal,
  report: (p: number) => void,
) {
  const n = 512;
  const hop = 128;
  const fft = new Fft(n);
  const frames = Math.max(1, Math.floor((samples.length - n) / hop) + 1);
  const bands = [
    new Float32Array(frames),
    new Float32Array(frames),
    new Float32Array(frames),
  ];
  const edges = [1, 10, 93, 256];
  const mag = new Float32Array(n / 2);
  const prev = new Float32Array(n / 2);
  for (let f = 0; f < frames; f++) {
    fft.magnitudes(samples, f * hop, mag);
    for (let b = 0; b < 3; b++) {
      let sum = 0;
      for (let k = edges[b]; k < edges[b + 1]; k++) {
        const lm = Math.log1p(100 * mag[k]);
        const d = lm - prev[k];
        if (d > 0 && f > 0) sum += d;
        prev[k] = lm;
      }
      bands[b][f] = sum;
    }
    if (f % 512 === 0) {
      report((f / frames) * 0.75);
      await wait(0, signal);
    }
  }
  return { bands, rate: SR / hop };
}

function detrend(o: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(o.length);
  let acc = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < o.length; i++) {
    while (hi < Math.min(o.length - 1, i + radius)) acc += o[++hi];
    while (lo < i - radius) acc -= o[lo++];
    out[i] = Math.max(0, o[i] - acc / (hi - lo + 1));
  }
  return out;
}

function estimateTempo(o: Float32Array, rate: number) {
  const minLag = Math.floor((rate * 60) / 200);
  const maxLag = Math.ceil((rate * 60) / 60);
  const ac = new Float64Array(maxLag + 2);
  for (let l = minLag - 1; l <= maxLag + 1; l++) {
    let s = 0;
    for (let i = 0; i + l < o.length; i++) s += o[i] * o[i + l];
    ac[l] = s / Math.max(1, o.length - l);
  }
  let best = minLag;
  let bestScore = -1;
  let mean = 0;
  for (let l = minLag; l <= maxLag; l++) {
    mean += ac[l];
    const bpm = (60 * rate) / l;
    const prior = Math.exp(-0.5 * (Math.log2(bpm / 120) / 0.9) ** 2);
    if (ac[l] * prior > bestScore) {
      bestScore = ac[l] * prior;
      best = l;
    }
  }
  mean /= maxLag - minLag + 1;
  const peakiness = mean > 0 ? ac[best] / mean : 0;
  const a = ac[best - 1];
  const b = ac[best];
  const c = ac[best + 1];
  const denom = a - 2 * b + c;
  const lag = denom !== 0 ? best + (0.5 * (a - c)) / denom : best;
  return { bpm: (60 * rate) / lag, peakiness };
}

function combScore(
  o: Float32Array,
  period: number,
  phase: number,
  every = 1,
  offset = 0,
): number {
  let s = 0;
  let count = 0;
  for (let t = phase + offset * period; t < o.length - 1; t += period * every) {
    s += o[Math.round(t)];
    count++;
  }
  return count ? s / count : 0;
}

/** Decode and analyse an uploaded song: tempo grid, key, per-bar chroma, melody and drum profiles. */
export async function analyzeSong(
  file: File,
  { signal, onProgress }: AnalyzeOptions,
): Promise<SongAnalysis> {
  validateFile(file);
  let stageStart = performance.now();
  const finishStage = async (stage: number) => {
    onProgress(stage, 1);
    const rest = STAGE_MIN_MS - (performance.now() - stageStart);
    if (rest > 0) await wait(rest, signal);
    stageStart = performance.now();
    onProgress(stage + 1, 0);
  };

  // 1 · decode
  onProgress(0, 0);
  const { samples, duration } = await decode(file, signal, (p) =>
    onProgress(0, p),
  );
  await finishStage(0);

  // 2 · beat
  const { bands, rate } = await onsetBands(samples, signal, (p) =>
    onProgress(1, p),
  );
  const norm = bands.map((band) => {
    let m = 0;
    for (const v of band) m += v;
    m = m / band.length || 1;
    return band.map((v) => v / m);
  });
  const combined = new Float32Array(norm[0].length);
  for (let i = 0; i < combined.length; i++)
    combined[i] = norm[0][i] + norm[1][i] + norm[2][i];
  const o = detrend(combined, 16);
  const lowO = detrend(norm[0], 16);
  const tempo = estimateTempo(o, rate);
  if (!Number.isFinite(tempo.bpm) || tempo.peakiness < 1.1)
    throw new AnalysisError("beat");
  let bpm = tempo.bpm;
  let phase = 0;
  let bestScore = -1;
  for (let cand = tempo.bpm * 0.97; cand <= tempo.bpm * 1.03; cand += 0.05) {
    const period = (60 * rate) / cand;
    for (let ph = 0; ph < period; ph += 1) {
      const s = combScore(o, period, ph);
      if (s > bestScore) {
        bestScore = s;
        bpm = cand;
        phase = ph;
      }
    }
  }
  onProgress(1, 0.9);
  const period = (60 * rate) / bpm;
  let down = 0;
  let downScore = -1;
  for (let b = 0; b < 4; b++) {
    const s = combScore(lowO, period, phase, 4, b);
    if (s > downScore) {
      downScore = s;
      down = b;
    }
  }
  const t0 = (phase + down * period) / rate;
  const sd = 60 / bpm / 4;
  const bars = Math.min(MAX_BARS, Math.floor((duration - t0) / (16 * sd)));
  if (bars < 2) throw new AnalysisError("short");
  const steps = bars * 16;
  const drums = norm.map(() => new Array<number>(16).fill(0));
  for (let i = 0; i < steps; i++) {
    const f = Math.round((t0 + i * sd) * rate);
    norm.forEach((band, b) => {
      let v = 0;
      for (let d = -1; d <= 1; d++) v = Math.max(v, band[f + d] ?? 0);
      drums[b][i % 16] += v;
    });
  }
  const profiles = drums.map((p) => {
    const max = Math.max(...p) || 1;
    return p.map((v) => round3(v / max));
  });
  await finishStage(1);

  // 3 · key (spectral pass: chroma + melody salience)
  const n = 4096;
  const hop = 512;
  const fft = new Fft(n);
  const binHz = SR / n;
  const rateB = SR / hop;
  const framesB = Math.max(1, Math.floor((samples.length - n) / hop) + 1);
  const pcOf = new Int8Array(n / 2).fill(-1);
  for (let k = 1; k < n / 2; k++) {
    const f = k * binHz;
    if (f < 80 || f > 2000) continue;
    pcOf[k] = ((Math.round(69 + 12 * Math.log2(f / 440)) % 12) + 12) % 12;
  }
  const harmonicBins = Array.from({ length: MEL_COUNT }, (_, i) => {
    const f0 = 440 * 2 ** ((MEL_LOW + i - 69) / 12);
    return [1, 2, 3, 4]
      .map((h) => Math.round((f0 * h) / binHz))
      .filter((k) => k < n / 2 - 1);
  });
  const chroma = new Float32Array(framesB * 12);
  const salience = new Float32Array(framesB * MEL_COUNT);
  const mag = new Float32Array(n / 2);
  for (let f = 0; f < framesB; f++) {
    fft.magnitudes(samples, f * hop, mag);
    for (let k = 1; k < n / 2; k++) {
      const pc = pcOf[k];
      if (pc >= 0) chroma[f * 12 + pc] += Math.sqrt(mag[k]);
    }
    for (let m = 0; m < MEL_COUNT; m++) {
      let s = 0;
      let w = 1;
      for (const k of harmonicBins[m]) {
        s += w * Math.max(mag[k - 1], mag[k], mag[k + 1]);
        w *= 0.85;
      }
      salience[f * MEL_COUNT + m] = s * (1 + m / 45);
    }
    if (f % 96 === 0) {
      onProgress(2, (f / framesB) * 0.95);
      await wait(0, signal);
    }
  }
  const frameAt = (t: number) =>
    Math.min(framesB - 1, Math.max(0, Math.round(t * rateB)));
  const barChroma: number[][] = [];
  const total = new Array<number>(12).fill(0);
  for (let j = 0; j < bars; j++) {
    const a = frameAt(t0 + j * 16 * sd);
    const b = Math.max(a + 1, frameAt(t0 + (j + 1) * 16 * sd));
    const v = new Array<number>(12).fill(0);
    for (let f = a; f < b; f++)
      for (let p = 0; p < 12; p++) v[p] += chroma[f * 12 + p];
    const max = Math.max(...v) || 1;
    barChroma.push(v.map((x) => round3(x / max)));
    for (let p = 0; p < 12; p++) total[p] += v[p] / max;
  }
  const key = estimateKey(total);
  await finishStage(2);

  // 4 · chord (per-bar harmonic profile, resolved against the key at arrangement time)
  onProgress(3, 0.6);
  await finishStage(3);

  // 5 · melody
  const strength: number[] = [];
  const pitch: number[] = [];
  for (let i = 0; i < steps; i++) {
    const a = frameAt(t0 + i * sd);
    const b = Math.max(a + 1, frameAt(t0 + (i + 1) * sd));
    let bestM = 0;
    let bestV = -1;
    for (let m = 0; m < MEL_COUNT; m++) {
      let s = 0;
      for (let f = a; f < b; f++) s += salience[f * MEL_COUNT + m];
      if (s > bestV) {
        bestV = s;
        bestM = m;
      }
    }
    strength.push(bestV / (b - a));
    pitch.push(MEL_LOW + bestM);
    if (i % 256 === 0) onProgress(4, (i / steps) * 0.9);
  }
  const sorted = [...strength].sort((x, y) => x - y);
  const threshold = sorted[Math.floor(sorted.length * 0.4)] ?? 0;
  const melody: (number | null)[] = pitch.map((p, i) =>
    strength[i] >= threshold ? p : null,
  );
  for (let i = 1; i < melody.length - 1; i++) {
    const a = melody[i - 1];
    const c = melody[i + 1];
    if (a !== null && a === c && melody[i] !== a) melody[i] = a;
    if (a === null && c === null) melody[i] = null;
  }
  await finishStage(4);

  return {
    bpm: Math.round(bpm * 10) / 10,
    root: key.root,
    mode: key.mode,
    bars,
    duration: Math.round(duration * 10) / 10,
    barChroma,
    melody,
    drums: { kick: profiles[0], snare: profiles[1], hat: profiles[2] },
  };
}

const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

function correlation(a: number[], b: number[]): number {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

/** Krumhansl–Kessler key estimate restricted to major / natural minor. */
function estimateKey(chroma: number[]): {
  root: number;
  mode: "major" | "minor";
} {
  let best = { root: 0, mode: "major" as "major" | "minor", r: -2 };
  for (let root = 0; root < 12; root++) {
    const rotated = chroma.map((_, i) => chroma[(i + root) % 12]);
    const maj = correlation(rotated, MAJOR_PROFILE);
    const min = correlation(rotated, MINOR_PROFILE);
    if (maj > best.r) best = { root, mode: "major", r: maj };
    if (min > best.r) best = { root, mode: "minor", r: min };
  }
  return { root: best.root, mode: best.mode };
}
