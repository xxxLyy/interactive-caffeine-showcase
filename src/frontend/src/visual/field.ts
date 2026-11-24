import type { KnobValues, PaletteColors, ShapeId } from "@/lib/instrument";
import * as THREE from "three";
import {
  RIPPLES,
  backdropFragment,
  backdropVertex,
  buildShape,
  particleFragment,
  particleVertex,
} from "./shaders";

THREE.ColorManagement.enabled = false;

const MORPH_SECONDS = 1.9;
const PALETTE_SECONDS = 1.2;

function quint(t: number): number {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2;
}

export function webglSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

interface FieldOptions {
  count: number;
  onTap: (x: number, y: number) => void;
}

/** three.js particle field with morphing shapes, palette tweening, ripples and inertial orbit. */
export class ParticleField {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  private group = new THREE.Group();
  private geometry = new THREE.BufferGeometry();
  private core: THREE.ShaderMaterial;
  private halo: THREE.ShaderMaterial;
  private backdrop: THREE.ShaderMaterial;
  private uniforms: Record<string, THREE.IUniform>;
  private rand: Float32Array;
  private count: number;
  private clock = new THREE.Clock();
  private morphStart = -10;
  private waveFrom = 0;
  private waveTo = 0;
  private colorFrom: THREE.Color[] = [];
  private colorTo: THREE.Color[] = [];
  private paletteStart = -10;
  private rippleIndex = 0;
  private energy = 0;
  private muted = false;
  private autoDrift = false;
  private knobs: KnobValues = {
    cutoff: 70,
    resonance: 40,
    reverb: 60,
    delay: 20,
  };
  private dirTarget = new THREE.Vector3();
  private hueTarget = 0;
  private yaw = 0.3;
  private pitch = 0.42;
  private velYaw = 0;
  private velPitch = 0;
  private dist = 8.5;
  private distTarget = 8.5;
  private pointers = new Map<number, { x: number; y: number }>();
  private down: { x: number; y: number; t: number; moved: boolean } | null =
    null;
  private pinchDist = 0;
  private ro: ResizeObserver;
  private container: HTMLElement;
  private onTap: (x: number, y: number) => void;
  levelSource: () => number = () => 0;

  constructor(container: HTMLElement, opts: FieldOptions) {
    this.container = container;
    this.count = opts.count;
    this.onTap = opts.onTap;
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.domElement.style.touchAction = "none";
    this.renderer.domElement.style.display = "block";
    container.appendChild(this.renderer.domElement);

    this.rand = new Float32Array(this.count * 4);
    for (let i = 0; i < this.rand.length; i++) this.rand[i] = Math.random();
    const start = buildShape("galaxy", this.count, this.rand);
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(this.count * 3), 3),
    );
    this.geometry.setAttribute(
      "aFrom",
      new THREE.BufferAttribute(start.slice(), 3),
    );
    this.geometry.setAttribute("aTo", new THREE.BufferAttribute(start, 3));
    this.geometry.setAttribute(
      "aRand",
      new THREE.BufferAttribute(this.rand, 4),
    );
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

    this.uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 1 },
      uSize: { value: 2.4 },
      uPixelRatio: { value: this.renderer.getPixelRatio() },
      uEnergy: { value: 0 },
      uNoise: { value: 0.4 },
      uFocus: { value: 8.5 },
      uWaveMix: { value: 0 },
      uCalm: { value: 0 },
      uDir: { value: new THREE.Vector3() },
      uRipples: {
        value: Array.from(
          { length: RIPPLES },
          () => new THREE.Vector4(0, 0, 0, -100),
        ),
      },
      uRippleAmp: { value: Array.from({ length: RIPPLES }, () => 0) },
      uColorA: { value: new THREE.Color("#ff2f9a") },
      uColorB: { value: new THREE.Color("#3fe0f2") },
      uHue: { value: 0 },
      uBright: { value: 1 },
      uHalo: { value: 0.1 },
    };
    const shared = {
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    };
    this.core = new THREE.ShaderMaterial({
      ...shared,
      uniforms: { ...this.uniforms, uLayer: { value: 0 } },
    });
    this.halo = new THREE.ShaderMaterial({
      ...shared,
      uniforms: { ...this.uniforms, uLayer: { value: 1 }, uSize: { value: 9 } },
    });
    const haloGeo = new THREE.BufferGeometry();
    for (const name of ["position", "aFrom", "aTo", "aRand"])
      haloGeo.setAttribute(name, this.geometry.getAttribute(name));
    haloGeo.setDrawRange(0, Math.floor(this.count / 3));
    haloGeo.boundingSphere = this.geometry.boundingSphere;
    this.group.add(
      new THREE.Points(haloGeo, this.halo),
      new THREE.Points(this.geometry, this.core),
    );

    this.backdrop = new THREE.ShaderMaterial({
      vertexShader: backdropVertex,
      fragmentShader: backdropFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uBase: { value: new THREE.Color("#0b0914") },
        uGlowA: { value: new THREE.Color("#4a0a3c") },
        uGlowB: { value: new THREE.Color("#062a52") },
        uTime: { value: 0 },
        uAspect: { value: 1 },
        uEnergy: { value: 0 },
      },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.backdrop);
    quad.frustumCulled = false;
    quad.renderOrder = -1;
    this.scene.add(quad, this.group);

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.handleDown);
    el.addEventListener("pointermove", this.handleMove);
    el.addEventListener("pointerup", this.handleUp);
    el.addEventListener("pointercancel", this.handleUp);
    el.addEventListener("wheel", this.handleWheel, { passive: false });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.renderer.setAnimationLoop(this.frame);
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.backdrop.uniforms.uAspect.value = w / h;
  }

  setShape(shape: ShapeId): void {
    const t = this.clock.getElapsedTime();
    const from = this.geometry.getAttribute("aFrom") as THREE.BufferAttribute;
    const to = this.geometry.getAttribute("aTo") as THREE.BufferAttribute;
    const fa = from.array as Float32Array;
    const ta = to.array as Float32Array;
    const morph = Math.min(1, (t - this.morphStart) / MORPH_SECONDS);
    for (let i = 0; i < this.count; i++) {
      let m = Math.min(
        1,
        Math.max(0, morph * 1.35 - this.rand[i * 4 + 3] * 0.35),
      );
      m = m < 0.5 ? 4 * m * m * m : 1 - (-2 * m + 2) ** 3 / 2;
      const x = fa[i * 3] + (ta[i * 3] - fa[i * 3]) * m;
      const y = fa[i * 3 + 1] + (ta[i * 3 + 1] - fa[i * 3 + 1]) * m;
      const z = fa[i * 3 + 2] + (ta[i * 3 + 2] - fa[i * 3 + 2]) * m;
      const len = Math.hypot(x, y, z) + 0.0001;
      const s = (Math.sin(m * Math.PI) * 0.45 * this.rand[i * 4 + 1]) / len;
      fa[i * 3] = x + x * s;
      fa[i * 3 + 1] = y + y * s;
      fa[i * 3 + 2] = z + z * s;
    }
    ta.set(buildShape(shape, this.count, this.rand));
    from.needsUpdate = true;
    to.needsUpdate = true;
    this.waveFrom = this.uniforms.uWaveMix.value as number;
    this.waveTo = shape === "wave" ? 1 : 0;
    this.morphStart = t;
  }

  setPalette(c: PaletteColors): void {
    const u = this.backdrop.uniforms;
    const current = [
      this.uniforms.uColorA.value,
      this.uniforms.uColorB.value,
      u.uGlowA.value,
      u.uGlowB.value,
      u.uBase.value,
    ] as THREE.Color[];
    this.colorFrom = current.map((col) => col.clone());
    this.colorTo = [c.a, c.b, c.glowA, c.glowB, c.base].map(
      (h) => new THREE.Color(h),
    );
    this.paletteStart = this.clock.getElapsedTime();
  }

  setKnobs(k: KnobValues): void {
    this.knobs = k;
  }

  setMuted(m: boolean): void {
    this.muted = m;
  }

  setAutoDrift(on: boolean): void {
    this.autoDrift = on;
  }

  private addRipple(origin: THREE.Vector3, amp: number, delay = 0): void {
    const i = this.rippleIndex;
    this.rippleIndex = (i + 1) % RIPPLES;
    const r = (this.uniforms.uRipples.value as THREE.Vector4[])[i];
    r.set(origin.x, origin.y, origin.z, this.clock.getElapsedTime() + delay);
    (this.uniforms.uRippleAmp.value as number[])[i] = amp;
  }

  noteRipple(midi: number, velocity: number): void {
    const angle = ((midi % 12) / 12) * Math.PI * 2;
    const lift = (midi - 72) / 24;
    this.dirTarget.set(Math.cos(angle), lift, Math.sin(angle)).normalize();
    this.hueTarget = ((midi - 72) / 24) * 0.9;
    const origin = this.dirTarget.clone().multiplyScalar(0.8);
    this.addRipple(origin, 0.7 + velocity * 0.8);
    if (this.knobs.delay > 12)
      this.addRipple(origin, (0.5 * this.knobs.delay) / 100, 0.34);
  }

  /** Kick-drum pulse: a radial ripple from the core. */
  pulse(strength = 1): void {
    this.addRipple(new THREE.Vector3(0, 0, 0), 0.9 + strength * 1.1);
  }

  /** Shockwave from a screen point; returns nothing, ripple happens in field space. */
  shock(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const normal = new THREE.Vector3();
    this.camera.getWorldDirection(normal);
    const hit = new THREE.Vector3();
    ray.ray.intersectPlane(new THREE.Plane(normal.negate(), 0), hit);
    this.group.updateMatrixWorld();
    this.addRipple(this.group.worldToLocal(hit), 2.6);
  }

  private handleDown = (e: PointerEvent): void => {
    this.renderer.domElement.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1)
      this.down = {
        x: e.clientX,
        y: e.clientY,
        t: performance.now(),
        moved: false,
      };
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.down) this.down.moved = true;
    }
  };

  private handleMove = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinchDist > 0)
        this.distTarget = THREE.MathUtils.clamp(
          this.distTarget * (this.pinchDist / d),
          3.5,
          15,
        );
      this.pinchDist = d;
      return;
    }
    if (
      this.down &&
      Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6
    )
      this.down.moved = true;
    if (this.down?.moved) {
      this.velYaw = dx * 0.0055;
      this.velPitch = dy * 0.0045;
      this.yaw += this.velYaw;
      this.pitch = THREE.MathUtils.clamp(this.pitch + this.velPitch, -1.3, 1.3);
    }
  };

  private handleUp = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (this.pointers.size === 0 && this.down) {
      if (
        !this.down.moved &&
        performance.now() - this.down.t < 450 &&
        e.type === "pointerup"
      ) {
        this.shock(e.clientX, e.clientY);
        this.onTap(e.clientX, e.clientY);
      }
      this.down = null;
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.distTarget = THREE.MathUtils.clamp(
      this.distTarget * (1 + e.deltaY * 0.0012),
      3.5,
      15,
    );
  };

  private frame = (): void => {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();
    const u = this.uniforms;
    u.uTime.value = t;
    this.backdrop.uniforms.uTime.value = t;

    const morph = Math.min(1, (t - this.morphStart) / MORPH_SECONDS);
    u.uMorph.value = morph;
    u.uWaveMix.value =
      this.waveFrom + (this.waveTo - this.waveFrom) * quint(morph);

    if (this.colorTo.length) {
      const p = quint(Math.min(1, (t - this.paletteStart) / PALETTE_SECONDS));
      const b = this.backdrop.uniforms;
      const targets = [
        u.uColorA.value,
        u.uColorB.value,
        b.uGlowA.value,
        b.uGlowB.value,
        b.uBase.value,
      ] as THREE.Color[];
      targets.forEach((col, i) =>
        col.copy(this.colorFrom[i]).lerp(this.colorTo[i], p),
      );
      if (p >= 1) this.colorTo = [];
    }

    const target = this.muted ? 0 : this.levelSource();
    this.energy +=
      (target - this.energy) * (target > this.energy ? 0.35 : 0.06);
    u.uEnergy.value = this.energy;
    this.backdrop.uniforms.uEnergy.value = this.energy;
    const calm = u.uCalm.value as number;
    u.uCalm.value = calm + ((this.muted ? 1 : 0) - calm) * 0.04;
    (u.uDir.value as THREE.Vector3).lerp(this.dirTarget, 0.06);
    u.uHue.value =
      (u.uHue.value as number) +
      (this.hueTarget * Math.min(1, this.energy * 3) -
        (u.uHue.value as number)) *
        0.05;

    const k = this.knobs;
    const noiseT = 0.15 + (k.resonance / 100) * 0.9 + (k.cutoff / 100) * 0.25;
    u.uNoise.value =
      (u.uNoise.value as number) + (noiseT - (u.uNoise.value as number)) * 0.08;
    u.uBright.value = 0.62 + (k.cutoff / 100) * 0.55 + this.energy * 0.5;
    u.uHalo.value = 0.05 + (k.reverb / 100) * 0.12 + this.energy * 0.12;

    if (!this.down || this.pointers.size === 0) {
      this.yaw += this.velYaw;
      this.pitch = THREE.MathUtils.clamp(this.pitch + this.velPitch, -1.3, 1.3);
      this.velYaw *= 0.94;
      this.velPitch *= 0.9;
    }
    this.yaw += dt * (this.autoDrift ? 0.12 : 0.025);
    if (this.autoDrift)
      this.pitch += (0.42 + Math.sin(t * 0.1) * 0.25 - this.pitch) * 0.004;
    this.dist += (this.distTarget - this.dist) * 0.07;
    this.group.rotation.set(this.pitch, this.yaw, 0, "XYZ");
    this.camera.position.set(0, 0, this.dist);
    this.camera.lookAt(0, 0, 0);
    u.uFocus.value = this.dist;

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.ro.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.handleDown);
    el.removeEventListener("pointermove", this.handleMove);
    el.removeEventListener("pointerup", this.handleUp);
    el.removeEventListener("pointercancel", this.handleUp);
    el.removeEventListener("wheel", this.handleWheel);
    this.geometry.dispose();
    this.core.dispose();
    this.halo.dispose();
    this.backdrop.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
