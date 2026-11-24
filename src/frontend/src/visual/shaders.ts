import type { ShapeId } from "@/lib/instrument";

/** Fill target positions for a shape. `rand` holds 4 stable randoms per particle. */
export function buildShape(
  shape: ShapeId,
  count: number,
  rand: Float32Array,
): Float32Array {
  const out = new Float32Array(count * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const side = Math.ceil(Math.sqrt(count));
  for (let i = 0; i < count; i++) {
    const r1 = rand[i * 4];
    const r2 = rand[i * 4 + 1];
    const r3 = rand[i * 4 + 2];
    const r4 = rand[i * 4 + 3];
    let x = 0;
    let y = 0;
    let z = 0;
    if (shape === "sphere") {
      const yy = 1 - (2 * (i + 0.5)) / count;
      const rr = Math.sqrt(1 - yy * yy);
      const phi = i * golden;
      let radius = 2.3 * (0.94 + 0.06 * r1);
      if (r2 < 0.14) radius *= Math.cbrt(r3) * 0.85;
      x = Math.cos(phi) * rr * radius;
      y = yy * radius;
      z = Math.sin(phi) * rr * radius;
    } else if (shape === "torus") {
      const u = r1 * Math.PI * 2;
      const v = r2 * Math.PI * 2;
      const tube = 0.78 * (0.55 + 0.45 * Math.sqrt(r3));
      const R = 2.1;
      x = (R + tube * Math.cos(v)) * Math.cos(u);
      y = tube * Math.sin(v);
      z = (R + tube * Math.cos(v)) * Math.sin(u);
    } else if (shape === "galaxy") {
      const radius = r1 ** 1.5 * 3.6 + 0.05;
      const branch = ((i % 3) / 3) * Math.PI * 2;
      const spin = radius * 1.35;
      const spread = (0.08 + 0.28 * radius) * (r2 - 0.5) * 2;
      const lift = (r3 - 0.5) * 2 * 0.35 * Math.exp(-radius * 0.6);
      x = Math.cos(branch + spin) * radius + spread * Math.cos(r4 * 6.283);
      y = lift + (r4 - 0.5) * 0.08;
      z = Math.sin(branch + spin) * radius + spread * Math.sin(r4 * 6.283);
    } else {
      const gx = i % side;
      const gz = Math.floor(i / side);
      x = (gx / side - 0.5) * 7 + (r1 - 0.5) * 0.02;
      z = (gz / side - 0.5) * 7 + (r2 - 0.5) * 0.02;
      y = Math.sin(x * 1.1) * Math.cos(z * 0.9) * 0.45;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

export const RIPPLES = 10;

export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uMorph;
uniform float uSize;
uniform float uPixelRatio;
uniform float uEnergy;
uniform float uNoise;
uniform float uFocus;
uniform float uWaveMix;
uniform float uCalm;
uniform vec3 uDir;
uniform vec4 uRipples[${RIPPLES}];
uniform float uRippleAmp[${RIPPLES}];
attribute vec3 aFrom;
attribute vec3 aTo;
attribute vec4 aRand;
varying float vAlpha;
varying float vMix;
varying float vRipple;

void main() {
  float m = clamp(uMorph * 1.35 - aRand.w * 0.35, 0.0, 1.0);
  m = m < 0.5 ? 4.0 * m * m * m : 1.0 - pow(-2.0 * m + 2.0, 3.0) / 2.0;
  vec3 p = mix(aFrom, aTo, m);
  p += normalize(p + 0.0001) * sin(m * 3.14159) * 0.45 * aRand.y;

  p.y += uWaveMix * sin(p.x * 1.4 + uTime * 1.2) * cos(p.z * 1.1 + uTime * 0.8) * 0.38;

  float breath = sin(uTime * (0.7 - uCalm * 0.4) + aRand.x * 6.2831) * 0.5 + 0.5;
  float swell = sin(uTime * 0.35) * 0.5 + 0.5;
  p *= 1.0 + 0.03 * breath + 0.02 * swell + uEnergy * 0.42 * (0.35 + aRand.z);

  vec3 n = vec3(
    sin(p.y * 2.1 + uTime * 0.9 + aRand.x * 6.0),
    sin(p.z * 1.7 - uTime * 0.7 + aRand.y * 6.0),
    sin(p.x * 1.9 + uTime * 1.1 + aRand.z * 6.0)
  );
  p += n * uNoise * (0.05 + uEnergy * 0.55) * (1.0 - uCalm * 0.6);
  p += uDir * uEnergy * 0.7 * (aRand.y - 0.3);

  float rip = 0.0;
  for (int i = 0; i < ${RIPPLES}; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.w;
    if (age < 0.0 || age > 3.5) continue;
    vec3 d = p - r.xyz;
    float dist = length(d);
    float front = age * 3.4;
    float band = exp(-pow((dist - front) * 2.0, 2.0));
    float amp = band * exp(-age * 1.3) * uRippleAmp[i];
    p += (d / (dist + 0.001)) * amp * 0.55;
    rip += amp;
  }

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = max(0.1, -mv.z);
  float blur = abs(depth - uFocus);
  float size = uSize * (0.35 + aRand.z * 0.95) * (1.0 + blur * 0.5) * (1.0 + rip * 1.1 + uEnergy * 0.7);
  gl_PointSize = size * uPixelRatio * (8.0 / depth);
  gl_Position = projectionMatrix * mv;

  vAlpha = (1.0 / (1.0 + blur * blur * 0.45)) * (0.5 + 0.5 * breath) * (1.0 - uCalm * 0.6);
  vAlpha *= 0.55 + uEnergy * 0.9 + rip * 1.4;
  vMix = clamp(aRand.x * 0.75 + length(p) * 0.1, 0.0, 1.0);
  vRipple = rip;
}
`;

export const particleFragment = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uHue;
uniform float uLayer;
uniform float uBright;
uniform float uHalo;
varying float vAlpha;
varying float vMix;
varying float vRipple;

vec3 hueShift(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = uLayer < 0.5
    ? pow(smoothstep(0.5, 0.0, d), 1.7)
    : exp(-d * d * 16.0) * uHalo;
  vec3 col = hueShift(mix(uColorA, uColorB, vMix), uHue);
  col += vRipple * 0.55;
  col *= uBright;
  gl_FragColor = vec4(col, a * vAlpha);
}
`;

export const backdropVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;

export const backdropFragment = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uGlowA;
uniform vec3 uGlowB;
uniform float uTime;
uniform float uAspect;
uniform float uEnergy;
varying vec2 vUv;
void main() {
  vec2 p = vUv;
  p.x *= uAspect;
  vec2 ca = vec2(0.22 * uAspect + sin(uTime * 0.07) * 0.08, 0.86 + cos(uTime * 0.05) * 0.05);
  vec2 cb = vec2(0.86 * uAspect + cos(uTime * 0.06) * 0.08, 0.12 + sin(uTime * 0.08) * 0.05);
  float ga = exp(-pow(length(p - ca) / (0.75 + uEnergy * 0.15), 2.0));
  float gb = exp(-pow(length(p - cb) / 0.7, 2.0));
  vec3 col = uBase + uGlowA * ga * (1.1 + uEnergy * 0.6) + uGlowB * gb;
  float vig = smoothstep(1.25, 0.25, length(vUv - 0.5) * 1.6);
  gl_FragColor = vec4(col * (0.55 + 0.45 * vig), 1.0);
}
`;
