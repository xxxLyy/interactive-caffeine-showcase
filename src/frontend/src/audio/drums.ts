/** Synthesized drum voices — no samples. Each schedules at `t` into `dest`. */

export function playKick(
  ctx: AudioContext,
  dest: AudioNode,
  t: number,
  vel = 1,
  tone = 1,
): void {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(150 * tone, t);
  o.frequency.exponentialRampToValueAtTime(44 * tone, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.95 * vel, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.45);
  const click = ctx.createOscillator();
  click.type = "triangle";
  click.frequency.setValueAtTime(1200, t);
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.18 * vel, t);
  cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  click.connect(cg).connect(dest);
  click.start(t);
  click.stop(t + 0.02);
}

export function playSnare(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  vel = 1,
  soft = false,
): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = soft ? "bandpass" : "highpass";
  hp.frequency.value = soft ? 2400 : 1400;
  const ng = ctx.createGain();
  const decay = soft ? 0.08 : 0.2;
  ng.gain.setValueAtTime(0.5 * vel, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(hp).connect(ng).connect(dest);
  src.start(t);
  src.stop(t + decay + 0.02);
  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(soft ? 420 : 220, t);
  body.frequency.exponentialRampToValueAtTime(soft ? 300 : 140, t + 0.08);
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.38 * vel, t);
  bg.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  body.connect(bg).connect(dest);
  body.start(t);
  body.stop(t + 0.12);
}

export function playHat(
  ctx: AudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t: number,
  vel = 1,
  open = false,
): void {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7200;
  const g = ctx.createGain();
  const decay = open ? 0.28 : 0.05;
  g.gain.setValueAtTime(0.22 * vel, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + decay);
  src.connect(hp).connect(g).connect(dest);
  src.start(t);
  src.stop(t + decay + 0.02);
}
