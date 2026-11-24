import { playHat, playKick, playSnare } from "@/audio/drums";
import {
  type KnobValues,
  SEQ_PITCHES,
  SEQ_STEPS,
  type Waveform,
  midiToFreq,
} from "@/lib/instrument";

interface Voice {
  oscs: OscillatorNode[];
  gain: GainNode;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

/** Web Audio synth: poly voices → biquad → (dry | convolver reverb | feedback delay) → master. */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private bus!: GainNode;
  private filter!: BiquadFilterNode;
  private reverbWet!: GainNode;
  private delay!: DelayNode;
  private delayFeedback!: GainNode;
  private delayWet!: GainNode;
  private master!: GainNode;
  private analyser!: AnalyserNode;
  private hitBus!: GainNode;
  /** Built-in track output (song player) and sequencer drum bus. */
  trackBus!: GainNode;
  private drumBus!: GainNode;
  noise!: AudioBuffer;
  private trackVolume = 0.8;
  private balance = 0;
  private samples = new Float32Array(1024);
  private voices = new Map<number, Voice>();
  private transient = new Set<OscillatorNode>();
  private waveform: Waveform = "sine";
  private knobs: KnobValues = {
    cutoff: 70,
    resonance: 40,
    reverb: 60,
    delay: 20,
  };
  private volume = 0.8;
  private muted = false;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;

  grid: boolean[][] = [];
  drums: boolean[][] = [];
  pitches: number[] = SEQ_PITCHES;
  bpm = 120;
  onNote: (midi: number, velocity: number) => void = () => {};
  onStep: (step: number) => void = () => {};
  onKick: (strength: number) => void = () => {};

  get started(): boolean {
    return this.ctx !== null;
  }

  async start(): Promise<void> {
    if (this.ctx) {
      await this.ctx.resume();
      return;
    }
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    const dry = ctx.createGain();
    const convolver = ctx.createConvolver();
    convolver.buffer = this.impulse(ctx, 3.4);
    this.reverbWet = ctx.createGain();
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = 0.34;
    this.delayFeedback = ctx.createGain();
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = "lowpass";
    delayTone.frequency.value = 3200;
    this.delayWet = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.hitBus = ctx.createGain();
    this.hitBus.gain.value = 0.9;
    this.drumBus = ctx.createGain();
    this.trackBus = ctx.createGain();
    const trackSend = ctx.createGain();
    trackSend.gain.value = 0.35;

    this.bus.connect(this.filter);
    this.filter.connect(dry).connect(comp);
    this.filter.connect(convolver);
    convolver.connect(this.reverbWet).connect(comp);
    this.filter.connect(this.delay);
    this.delay
      .connect(delayTone)
      .connect(this.delayFeedback)
      .connect(this.delay);
    this.delay.connect(this.delayWet).connect(comp);
    this.hitBus.connect(comp);
    this.hitBus.connect(convolver);
    this.drumBus.connect(comp);
    this.trackBus.connect(comp);
    this.trackBus.connect(trackSend).connect(convolver);
    comp.connect(this.master).connect(this.analyser).connect(ctx.destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    this.applyKnobs(true);
    this.applyMaster(true);
    this.applyMix(true);
    await ctx.resume();
  }

  private impulse(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.6;
    }
    return buf;
  }

  setWaveform(w: Waveform): void {
    this.waveform = w;
    for (const v of this.voices.values()) for (const o of v.oscs) o.type = w;
    for (const o of this.transient) o.type = w;
  }

  setKnobs(k: KnobValues): void {
    this.knobs = k;
    this.applyKnobs(false);
  }

  private applyKnobs(immediate: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const tc = immediate ? 0.001 : 0.03;
    const k = this.knobs;
    this.filter.frequency.setTargetAtTime(
      120 * (18000 / 120) ** (k.cutoff / 100),
      t,
      tc,
    );
    this.filter.Q.setTargetAtTime(0.5 + (k.resonance / 100) * 17, t, tc);
    this.reverbWet.gain.setTargetAtTime((k.reverb / 100) * 0.9, t, tc);
    this.delayWet.gain.setTargetAtTime((k.delay / 100) * 0.6, t, tc);
    this.delayFeedback.gain.setTargetAtTime((k.delay / 100) * 0.68, t, tc);
  }

  setVolume(v: number): void {
    this.volume = v;
    this.applyMaster(false);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyMaster(false);
  }

  private applyMaster(immediate: boolean): void {
    if (!this.ctx) return;
    const target = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(
      target,
      this.ctx.currentTime,
      immediate ? 0.001 : 0.04,
    );
  }

  /** trackVolume 0–1; balance −1 (all track) … +1 (all live playing). */
  setMix(trackVolume: number, balance: number): void {
    this.trackVolume = trackVolume;
    this.balance = balance;
    this.applyMix(false);
  }

  private applyMix(immediate: boolean): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const tc = immediate ? 0.001 : 0.05;
    const track = Math.min(1, 1 - this.balance);
    const live = Math.min(1, 1 + this.balance);
    this.trackBus.gain.setTargetAtTime(this.trackVolume ** 2 * track, t, tc);
    this.bus.gain.setTargetAtTime(live, t, tc);
    this.hitBus.gain.setTargetAtTime(0.9 * live, t, tc);
    this.drumBus.gain.setTargetAtTime(0.85 * live, t, tc);
  }

  /** Short one-shot note (game hits, jam taps). */
  pluck(midi: number, velocity = 0.9, seconds = 0.28): void {
    if (!this.ctx) return;
    this.noteOn(midi, velocity);
    window.setTimeout(() => this.noteOff(midi), seconds * 1000);
  }

  private makeVoice(midi: number, time: number, velocity: number): Voice {
    const ctx = this.ctx as AudioContext;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    const peak = 0.16 * velocity;
    gain.gain.linearRampToValueAtTime(peak, time + 0.012);
    gain.gain.setTargetAtTime(peak * 0.62, time + 0.012, 0.12);
    gain.connect(this.bus);
    const oscs = [0, 7].map((cents) => {
      const o = ctx.createOscillator();
      o.type = this.waveform;
      o.frequency.value = midiToFreq(midi);
      o.detune.value = cents;
      o.connect(gain);
      o.start(time);
      return o;
    });
    return { oscs, gain };
  }

  private release(v: Voice, time: number): void {
    const g = v.gain.gain;
    if (typeof g.cancelAndHoldAtTime === "function")
      g.cancelAndHoldAtTime(time);
    else g.cancelScheduledValues(time);
    v.gain.gain.setTargetAtTime(0, time, 0.14);
    for (const o of v.oscs) o.stop(time + 1);
  }

  noteOn(midi: number, velocity = 0.9): void {
    if (!this.ctx) return;
    const existing = this.voices.get(midi);
    if (existing) this.release(existing, this.ctx.currentTime);
    this.voices.set(midi, this.makeVoice(midi, this.ctx.currentTime, velocity));
    this.onNote(midi, velocity);
  }

  noteOff(midi: number): void {
    const v = this.voices.get(midi);
    if (!v || !this.ctx) return;
    this.release(v, this.ctx.currentTime);
    this.voices.delete(midi);
  }

  allNotesOff(): void {
    for (const m of [...this.voices.keys()]) this.noteOff(m);
  }

  hit(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.9;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.55, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(bp).connect(ng).connect(this.hitBus);
    src.start(t);
    src.stop(t + 0.3);
    const body = ctx.createOscillator();
    body.frequency.setValueAtTime(160, t);
    body.frequency.exponentialRampToValueAtTime(42, t + 0.24);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.8, t);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    body.connect(bg).connect(this.hitBus);
    body.start(t);
    body.stop(t + 0.35);
  }

  /** RMS output level 0–1 and dBFS */
  getLevel(): { level: number; db: number } {
    if (!this.ctx) return { level: 0, db: -60 };
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (let i = 0; i < this.samples.length; i++)
      sum += this.samples[i] * this.samples[i];
    const rms = Math.sqrt(sum / this.samples.length);
    return {
      level: Math.min(1, rms * 4.5),
      db: Math.max(-60, 20 * Math.log10(rms + 1e-6)),
    };
  }

  get playing(): boolean {
    return this.timer !== null;
  }

  play(): void {
    if (!this.ctx || this.timer !== null) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.schedule();
  }

  pause(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD) {
      const stepDur = 60 / this.bpm / 4;
      const step = this.step;
      const time = this.nextTime;
      const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
      const notes: number[] = [];
      this.pitches.forEach((midi, r) => {
        if (this.grid[r]?.[step]) notes.push(midi);
      });
      for (const midi of notes) this.scheduleNote(midi, time, stepDur * 0.9);
      if (this.drums[0]?.[step]) playKick(ctx, this.drumBus, time, 0.9);
      if (this.drums[1]?.[step])
        playSnare(ctx, this.drumBus, this.noise, time, 0.8);
      if (this.drums[2]?.[step])
        playHat(
          ctx,
          this.drumBus,
          this.noise,
          time,
          step % 4 === 0 ? 0.9 : 0.6,
        );
      window.setTimeout(() => {
        this.onStep(step);
        for (const midi of notes) this.onNote(midi, 0.75);
        if (this.drums[0]?.[step]) this.onKick(0.8);
      }, delayMs);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % SEQ_STEPS;
    }
  }

  private scheduleNote(midi: number, time: number, dur: number): void {
    const v = this.makeVoice(midi, time, 0.75);
    for (const o of v.oscs) {
      this.transient.add(o);
      o.onended = () => this.transient.delete(o);
    }
    this.release(v, time + dur);
  }

  dispose(): void {
    this.pause();
    void this.ctx?.close();
    this.ctx = null;
  }
}
