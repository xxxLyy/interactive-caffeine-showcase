/** In-place iterative radix-2 FFT with a Hann window, returning magnitude spectra. */
export class Fft {
  readonly size: number;
  private re: Float64Array;
  private im: Float64Array;
  private cos: Float64Array;
  private sin: Float64Array;
  private rev: Uint32Array;
  private win: Float64Array;

  constructor(size: number) {
    this.size = size;
    this.re = new Float64Array(size);
    this.im = new Float64Array(size);
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    this.win = new Float64Array(size);
    this.rev = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos((-2 * Math.PI * i) / size);
      this.sin[i] = Math.sin((-2 * Math.PI * i) / size);
    }
    for (let i = 0; i < size; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
      this.win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1));
    }
  }

  /** Magnitudes of bins 0..size/2-1 for the frame starting at `offset` (zero-padded past the end). */
  magnitudes(signal: Float32Array, offset: number, out: Float32Array): void {
    const { size, re, im, rev, win } = this;
    for (let i = 0; i < size; i++) {
      const j = offset + i;
      re[rev[i]] = j < signal.length ? signal[j] * win[i] : 0;
      im[i] = 0;
    }
    for (let len = 2; len <= size; len <<= 1) {
      const half = len >> 1;
      const step = size / len;
      for (let i = 0; i < size; i += len) {
        for (let k = 0; k < half; k++) {
          const c = this.cos[k * step];
          const s = this.sin[k * step];
          const a = i + k;
          const b = a + half;
          const tr = re[b] * c - im[b] * s;
          const ti = re[b] * s + im[b] * c;
          re[b] = re[a] - tr;
          im[b] = im[a] - ti;
          re[a] += tr;
          im[a] += ti;
        }
      }
    }
    for (let k = 0; k < size / 2; k++)
      out[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
  }
}
