# Design Brief

## Direction

RESONANCE / 共振 — a cinematic, full-screen WebGL particle synthesizer where editorial typography collides with living light; uploaded songs become playable arrangements.

## Tone

Dark editorial-futurism: magazine-grade type tension (heavy grotesk + outlined + italic serif) over a deep ink-violet void, never generic "tech blue".

## Differentiation

Giant staggered wordmark "RESON / ANCE" (solid + stroke) pierced by italic serif "共振"; upload analysis reads like a lab instrument — marching dashed dropzone, 5-dot stepper, giant BPM numeral.

## Color Palette

| Token      | OKLCH            | Role                                            |
| ---------- | ---------------- | ----------------------------------------------- |
| background | 0.12 0.025 290   | ink-violet void behind particles                |
| foreground | 0.95 0.015 80    | warm bone white for type and values             |
| card       | 0.17 0.03 290    | glass panel base (use `.glass` at 55% alpha)    |
| primary    | 0.68 0.26 350    | hot magenta — active keys, lit steps, CTA, active analysis step |
| accent     | 0.84 0.14 200    | electric cyan — knob arcs, focus ring, USER tag |
| muted / fg | 0.2 0.03 290 / 0.66 0.03 290 | inactive cells / labels, readouts   |
| step-done  | 0.78 0.17 155    | completed analysis step (fixed across palettes) |
| step-idle  | 0.36 0.03 290    | pending analysis step                           |

Palettes swap via `data-palette` on `<html>`: `neon` · `gold` · `aurora` · `ice` · `ember` · `sakura`; each sets primary/accent/ring and `--glow-a/--glow-b`. WebGL mirrors these as literal colors. Do not add or restyle palettes.

Game tokens (fixed): `--judge-perfect/good/miss`, `--rank-s/a/b/c` via `.text-judge-*`, `.text-rank-*`, `.text-stroke-rank-s`.

## Typography

- Display: Space Grotesk 700, `tracking-[-0.05em]`, outlined via `.text-stroke`; Accent: Instrument Serif Italic (`.font-serif-italic`)
- Body: Space Grotesk 400/500 — 中文 + English pairs ("上传歌曲 UPLOAD"); Mono: JetBrains Mono (`.readout`) for BPM/KEY/chords
- Scale: hero `text-[18vw] md:text-[14vw] leading-[0.8]`, result BPM `text-6xl` tabular, h2 `text-3xl md:text-5xl`, label `.readout` 11px, body `text-sm`

## Elevation & Depth

Depth from layers, not shadows: particles → `.bg-atmosphere` → `.grain` → `.glass` panels with 1px `.hairline`; `shadow-elevated` only for drawers/dialogs.

## Structural Zones

| Zone          | Background                 | Border            | Notes                                          |
| ------------- | -------------------------- | ----------------- | ---------------------------------------------- |
| Corners (HUD) | transparent                | hairline brackets | NOTE / BPM / FORM / ENERGY readouts            |
| Hero overlay  | transparent over canvas    | —                 | wordmark + 启动 CTA; collapses after start     |
| Right rail    | `.glass`                   | 1px hairline      | knobs, palettes, presets, forms                |
| Bottom dock   | `.glass` gradient to void  | hairline top      | 16-step sequencer above 2-octave keys          |
| Mobile        | bottom drawer `.glass`     | hairline top      | rail collapses into drawer                     |
| Track library | rail section `.glass`      | hairline rows     | 曲库; active row `.track-active-bar` + `animate-eq-bar` |
| Upload block  | `.dropzone` inside library | dashed gradient   | top of 曲库; `.dropzone-active` on drag, `-error` on fail |
| Analysis      | inline in library          | hairline divider  | 5-step stepper + `.progress-hairline` + `.analysis-sweep` |
| Result card   | `.glass` nested            | 1px hairline      | BPM numeral, stroked key, `.chord-chip` row, 立即演奏 CTA |
| 我的曲目       | library group              | hairline rows     | `.user-track-tag` USER; empty state serif-italic hint |
| Game overlays | `.scrim-game` full-screen  | —                 | count-in, pause, results `.glass` card         |

## Spacing & Rhythm

4px micro-grid inside controls (gap-1/gap-2), 24–40px edge insets; HUD 20px from viewport corners.

## Component Patterns

- Buttons: pill hairline outline; hover `primary/15`, press `scale-[0.96]` + `ease-spring`; CTA `animate-halo-pulse` + `shadow-ring-halo`
- Keys/steps/knobs/swatches/drum rows: unchanged (lit `shadow-key-lit`, cursor `animate-scan-blink`, 270° arc knobs)
- Dropzone: `rounded-xl .dropzone` + `animate-dash-march` while hovered/dragging; big grotesk "UPLOAD", mono format hint
- Stepper: 解码 DECODE → 节拍 BEAT → 调性 KEY → 和弦 CHORD → 旋律 MELODY; dots `.step-idle/.step-active/.step-done`, done plays `animate-step-tick`
- Analysis bar: `.progress-hairline` width transition + overlay `.analysis-sweep animate-analysis-sweep`; mini waveform bars `animate-wave-rise` staggered 30ms
- Result card: `animate-card-reveal`; BPM/root/major-minor tweak via mono chips + steppers; current chord `.chord-chip-current`
- Errors: `text-destructive` 中文 message + pill 重试 RETRY; delete confirm in AlertDialog `.glass`
- Rhythm game orbs/results: `animate-ring-shrink` (`--ring-duration`), `animate-judge-pop`, `animate-rank-slam`

## Motion

- Entrance: `animate-char-rise` staggered 40ms; UI `animate-fade-up` 80ms stagger (not on translated elements)
- Hover 450ms `ease-out-expo`; press 160ms then spring 500ms; interactive elements `.transition-ui`
- Palette/track transitions: 1.2s `ease-in-out-quint` on atmosphere + particle morph
- Analysis: steps tick in sequence; result card reveals 0.8s blur-to-sharp after final tick
- Game: `animate-combo-bump`, `animate-miss-shake`; reduced-motion respected (no keyframe ends at opacity 0 for new anims)

## Constraints

- Dark-only; never light surfaces; tokens only (WebGL exempt)
- Max 2 accent hues visible at once (primary + accent) plus step-done green in stepper only
- Every Chinese label paired with English mono/grotesk counterpart

## Signature Detail

Typographic collision: solid + outlined grotesk wordmark slashed by italic serif "共振"; generated result echoes it — giant BPM solid, key outlined.
