import { playHat, playKick, playSnare } from "@/audio/drums";
import type { AudioEngine } from "@/audio/engine";
import { midiToFreq } from "@/lib/instrument";
import { degreeToMidi } from "@/lib/scales";
import {
  STEPS_PER_BAR,
  type Track,
  chordDegree,
  leadAt,
  stepDuration,
  stepTime,
  trackDuration,
  trackSteps,
} from "@/lib/tracks";

const LOOKAHEAD_MS = 25;
const AHEAD = 0.14;

/** Live synthesis of a built-in track: drums, bass, pad and lead from pattern data. */
export class SongPlayer {
  track: Track | null = null;
  loop = false;
  onKick: () => void = () => {};
  onLead: (midi: number, velocity: number) => void = () => {};
  onEnd: () => void = () => {};

  private timer: number | null = null;
  private step = 0;
  private origin = 0;
  private filter: BiquadFilterNode | null = null;

  constructor(private engine: AudioEngine) {}

  get playing(): boolean {
    return this.timer !== null;
  }

  load(track: Track): void {
    this.stop();
    this.track = track;
  }

  /** Seconds since step 0 of the current pass (audio clock). */
  position(): number {
    const ctx = this.engine.ctx;
    const track = this.track;
    if (!ctx || !track) return 0;
    if (!this.playing) return stepTime(track, this.step);
    const latency = ctx.outputLatency || ctx.baseLatency || 0;
    return Math.min(
      trackDuration(track),
      Math.max(0, ctx.currentTime - latency - this.origin),
    );
  }

  progress(): number {
    return this.track ? this.position() / trackDuration(this.track) : 0;
  }

  play(): void {
    const ctx = this.engine.ctx;
    const track = this.track;
    if (!ctx || !track || this.timer !== null) return;
    if (!this.filter) {
      this.filter = ctx.createBiquadFilter();
      this.filter.type = "lowpass";
      this.filter.Q.value = 2;
      this.filter.connect(this.engine.trackBus);
    }
    this.filter.frequency.setValueAtTime(track.cutoff, ctx.currentTime);
    this.origin = ctx.currentTime + 0.08 - stepTime(track, this.step);
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.schedule();
  }

  pause(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  stop(): void {
    this.pause();
    this.step = 0;
  }

  private schedule(): void {
    const ctx = this.engine.ctx;
    const track = this.track;
    if (!ctx || !track) return;
    const total = trackSteps(track);
    while (this.origin + stepTime(track, this.step) < ctx.currentTime + AHEAD) {
      if (this.step >= total) {
        if (this.loop) {
          this.origin += stepTime(track, total);
          this.step = 0;
          continue;
        }
        const endAt = this.origin + stepTime(track, total);
        this.pause();
        this.step = 0;
        window.setTimeout(
          () => this.onEnd(),
          Math.max(0, (endAt - ctx.currentTime) * 1000),
        );
        return;
      }
      this.scheduleStep(
        ctx,
        track,
        this.step,
        this.origin + stepTime(track, this.step),
      );
      this.step++;
    }
  }

  private scheduleStep(
    ctx: AudioContext,
    track: Track,
    step: number,
    time: number,
  ): void {
    const s = step % STEPS_PER_BAR;
    const bar = Math.floor(step / STEPS_PER_BAR);
    const bus = this.engine.trackBus;
    const noise = this.engine.noise;
    const dur = stepDuration(track);
    const chord = chordDegree(track, bar);
    const delay = Math.max(0, (time - ctx.currentTime) * 1000);

    const k = track.kick[s];
    if (k !== ".") {
      playKick(ctx, bus, time, k === "x" ? 1 : 0.6);
      if (k === "x") window.setTimeout(() => this.onKick(), delay);
    }
    const sn = track.snare[s];
    if (sn !== ".")
      playSnare(ctx, bus, noise, time, sn === "x" ? 0.9 : 0.5, sn === "o");
    const h = track.hat[s];
    if (h !== ".")
      playHat(ctx, bus, noise, time, h === "x" ? 0.9 : 0.55, h === "O");

    const b = track.bass[s];
    if (b === "x" || b === "o" || b === "f") {
      let len = 1;
      while (s + len < STEPS_PER_BAR && track.bass[s + len] === "-") len++;
      const rootMidi = degreeToMidi(chord, track.root, track.scale, 36);
      const midi =
        b === "o" ? rootMidi + 12 : b === "f" ? rootMidi + 7 : rootMidi;
      this.tone(ctx, midi, track.bassWave, time, dur * len * 0.92, 0.2, 700);
    }

    if (track.pad && s === 0) {
      for (const off of [0, 2, 4])
        this.tone(
          ctx,
          degreeToMidi(chord + off, track.root, track.scale, 60),
          "triangle",
          time,
          dur * STEPS_PER_BAR,
          0.035,
          1600,
          0.6,
        );
    }

    const lead = leadAt(track, step);
    if (lead) {
      const v = s % 4 === 0 ? 0.95 : 0.75;
      this.tone(
        ctx,
        lead.midi,
        track.leadWave,
        time,
        dur * lead.len * 0.95,
        0.09 * v,
      );
      window.setTimeout(() => this.onLead(lead.midi, v), delay);
    }
  }

  private tone(
    ctx: AudioContext,
    midi: number,
    wave: OscillatorType,
    time: number,
    dur: number,
    peak: number,
    lowpass?: number,
    attack = 0.008,
  ): void {
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.value = midiToFreq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + attack);
    g.gain.setTargetAtTime(peak * 0.7, time + attack, 0.1);
    g.gain.setTargetAtTime(0, time + Math.max(attack, dur), 0.08);
    o.connect(g);
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass;
      g.connect(f).connect(this.engine.trackBus);
    } else if (this.filter) {
      g.connect(this.filter);
    }
    o.start(time);
    o.stop(time + dur + 0.6);
  }
}
