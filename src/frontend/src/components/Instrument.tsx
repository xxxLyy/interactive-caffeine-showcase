import { AudioEngine } from "@/audio/engine";
import { SongPlayer } from "@/audio/song";
import { useIsMobile } from "@/hooks/use-mobile";
import { useComputerKeyboard } from "@/hooks/useComputerKeyboard";
import { useSongAnalysis } from "@/hooks/useSongAnalysis";
import { useTrackPlayer } from "@/hooks/useTrackPlayer";
import { useUserTracks } from "@/hooks/useUserTracks";
import { DEMO_TRACK } from "@/lib/demoTrack";
import { type BestScores, loadBest, saveBest } from "@/lib/game";
import {
  INITIAL_KNOBS,
  type KnobId,
  type KnobValues,
  PALETTES,
  type PaletteId,
  type Preset,
  SHAPES,
  type ShapeId,
  type Waveform,
  defaultDrums,
  defaultGrid,
  easeOutExpo,
  emptyDrums,
  emptyGrid,
  midiToName,
  randomDrums,
  randomGrid,
} from "@/lib/instrument";
import {
  ROOTS,
  type ScaleId,
  degreeToMidi,
  getScale,
  inScale,
  sequencerPitches,
  snapToScale,
} from "@/lib/scales";
import { TRACKS, type Track } from "@/lib/tracks";
import type { SongAnalysis } from "@/lib/userTracks";
import { cn } from "@/lib/utils";
import { ParticleField, webglSupported } from "@/visual/field";
import {
  ChevronDown,
  ChevronUp,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ControlRail } from "./ControlRail";
import { Hero } from "./Hero";
import { Hud } from "./Hud";
import { Keyboard } from "./Keyboard";
import { RhythmGame } from "./RhythmGame";
import { ScalePicker } from "./ScalePicker";
import { Sequencer } from "./Sequencer";
import { TrackPanel } from "./TrackPanel";
import { WebGLFallback } from "./WebGLFallback";

interface Shock {
  id: number;
  x: number;
  y: number;
}

export function Instrument() {
  const [engine] = useState(() => new AudioEngine());
  const fieldRef = useRef<ParticleField | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [dockEl, setDockEl] = useState<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  const [webgl, setWebgl] = useState(true);
  const [started, setStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [shape, setShape] = useState<ShapeId>("galaxy");
  const [palette, setPalette] = useState<PaletteId>("neon");
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [knobs, setKnobs] = useState<KnobValues>(INITIAL_KNOBS);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [grid, setGrid] = useState<boolean[][]>(defaultGrid);
  const [step, setStep] = useState(-1);
  const [note, setNote] = useState("—");
  const [activeKeys, setActiveKeys] = useState<Set<number>>(() => new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [shocks, setShocks] = useState<Shock[]>([]);
  const [dockH, setDockH] = useState(0);
  const [song] = useState(() => new SongPlayer(engine));
  const [drums, setDrums] = useState<boolean[][]>(defaultDrums);
  const [root, setRoot] = useState(0);
  const [scale, setScale] = useState<ScaleId>("minorPenta");
  const [jam, setJam] = useState(false);
  const [trackVolume, setTrackVolume] = useState(0.8);
  const [balance, setBalance] = useState(0);
  const [best, setBest] = useState<BestScores>(loadBest);
  const [gameOpen, setGameOpen] = useState(false);
  const knobsRef = useRef(knobs);
  knobsRef.current = knobs;
  const tweenRef = useRef(0);
  const soundingRef = useRef(new Map<number, number>());

  const onTrackStart = useCallback((t: Track) => {
    setPresetId(null);
    setPalette(t.palette);
    setShape(t.shape);
  }, []);
  const userTracks = useUserTracks();
  const library = useMemo(
    () => [...TRACKS, DEMO_TRACK, ...userTracks.tracks],
    [userTracks.tracks],
  );
  const player = useTrackPlayer(song, library, onTrackStart);
  const [resultId, setResultId] = useState<string | null>(null);
  const addUserTrack = userTracks.add;
  const analysis = useSongAnalysis(
    useCallback(
      (result: SongAnalysis, fileName: string) =>
        setResultId(addUserTrack(result, fileName).id),
      [addUserTrack],
    ),
  );
  const removeUserTrack = userTracks.remove;
  const deleteTrack = useCallback(
    (id: string) => {
      removeUserTrack(id);
      setResultId((r) => (r === id ? null : r));
      setBest((b) => {
        if (!(id in b)) return b;
        const { [id]: _, ...rest } = b;
        saveBest(rest);
        return rest;
      });
    },
    [removeUserTrack],
  );
  const jamActive = jam && player.playing;
  const snapRoot = jamActive ? player.track.root : root;
  const snapScale = jamActive ? player.track.scale : scale;
  const snapRef = useRef({ root: snapRoot, scale: snapScale, jam: jamActive });
  snapRef.current = { root: snapRoot, scale: snapScale, jam: jamActive };

  // Field + engine wiring (mount once)
  useEffect(() => {
    const host = hostRef.current;
    engine.onNote = (midi, velocity) => {
      fieldRef.current?.noteRipple(midi, velocity);
      setNote(midiToName(midi));
    };
    engine.onStep = setStep;
    engine.onKick = (s) => fieldRef.current?.pulse(s);
    song.onKick = () => fieldRef.current?.pulse(1);
    song.onLead = (midi, velocity) => {
      fieldRef.current?.noteRipple(midi, velocity * 0.8);
      setNote(midiToName(midi));
    };
    if (host && webglSupported()) {
      try {
        const field = new ParticleField(host, {
          count: window.innerWidth < 768 ? 22000 : 48000,
          onTap: (x, y) => {
            engine.hit();
            if (snapRef.current.jam) {
              const { root: r, scale: sc } = snapRef.current;
              const deg = Math.round((1 - y / window.innerHeight) * 9);
              engine.pluck(degreeToMidi(deg, r, sc, 60), 0.8, 0.4);
            }
            setShocks((s) => [...s.slice(-4), { id: performance.now(), x, y }]);
          },
        });
        field.levelSource = () => engine.getLevel().level;
        fieldRef.current = field;
      } catch {
        setWebgl(false);
      }
    } else {
      setWebgl(false);
    }
    return () => {
      fieldRef.current?.dispose();
      fieldRef.current = null;
      song.stop();
      engine.dispose();
    };
  }, [engine, song]);

  useEffect(() => {
    engine.pitches = sequencerPitches(root, scale);
  }, [engine, root, scale]);
  useEffect(() => {
    engine.drums = drums;
  }, [engine, drums]);
  useEffect(
    () => engine.setMix(trackVolume, balance),
    [engine, trackVolume, balance],
  );

  useEffect(() => {
    engine.setKnobs(knobs);
    fieldRef.current?.setKnobs(knobs);
  }, [engine, knobs]);
  useEffect(() => engine.setWaveform(waveform), [engine, waveform]);
  useEffect(() => engine.setVolume(volume), [engine, volume]);
  useEffect(() => {
    engine.setMuted(muted);
    fieldRef.current?.setMuted(muted);
  }, [engine, muted]);
  useEffect(() => {
    engine.bpm = bpm;
  }, [engine, bpm]);
  useEffect(() => {
    engine.grid = grid;
  }, [engine, grid]);
  useEffect(() => fieldRef.current?.setShape(shape), [shape]);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    const colors = PALETTES.find((p) => p.id === palette)?.colors;
    if (colors) fieldRef.current?.setPalette(colors);
  }, [palette]);

  // Pure viewing mode: auto drift + orbit
  useEffect(() => {
    fieldRef.current?.setAutoDrift(collapsed || !started);
    if (!collapsed || !started) return;
    const id = window.setInterval(() => {
      setShape(
        (s) =>
          SHAPES[(SHAPES.findIndex((x) => x.id === s) + 1) % SHAPES.length].id,
      );
    }, 9000);
    return () => window.clearInterval(id);
  }, [collapsed, started]);

  useEffect(() => {
    if (!dockEl) return;
    const ro = new ResizeObserver(() => setDockH(dockEl.offsetHeight));
    ro.observe(dockEl);
    return () => ro.disconnect();
  }, [dockEl]);

  useEffect(() => () => cancelAnimationFrame(tweenRef.current), []);

  const enter = async () => {
    setStarting(true);
    try {
      await engine.start();
      setStarted(true);
      engine.noteOn(60, 0.6);
      window.setTimeout(() => engine.noteOff(60), 900);
    } finally {
      setStarting(false);
    }
  };

  const keyDown = useCallback(
    (midi: number) => {
      if (!engine.started) return;
      const { root: r, scale: sc } = snapRef.current;
      const sounding = snapToScale(midi, r, sc);
      const prev = soundingRef.current.get(midi);
      if (prev !== undefined) engine.noteOff(prev);
      soundingRef.current.set(midi, sounding);
      engine.noteOn(sounding);
      setActiveKeys((s) => new Set(s).add(midi));
    },
    [engine],
  );
  const keyUp = useCallback(
    (midi: number) => {
      const sounding = soundingRef.current.get(midi) ?? midi;
      soundingRef.current.delete(midi);
      if (![...soundingRef.current.values()].includes(sounding))
        engine.noteOff(sounding);
      setActiveKeys((s) => {
        const n = new Set(s);
        n.delete(midi);
        return n;
      });
    },
    [engine],
  );
  useComputerKeyboard(started && !gameOpen, keyDown, keyUp);

  const setKnob = (id: KnobId, v: number) => {
    cancelAnimationFrame(tweenRef.current);
    setPresetId(null);
    setKnobs((k) => ({ ...k, [id]: v }));
  };

  const applyPreset = (p: Preset) => {
    setPresetId(p.id);
    setWaveform(p.waveform);
    setShape(p.shape);
    setPalette(p.palette);
    cancelAnimationFrame(tweenRef.current);
    const from = { ...knobsRef.current };
    const t0 = performance.now();
    const run = (now: number) => {
      const e = easeOutExpo(Math.min(1, (now - t0) / 1100));
      const next = { ...from };
      for (const id of Object.keys(from) as KnobId[])
        next[id] = Math.round(from[id] + (p.knobs[id] - from[id]) * e);
      setKnobs(next);
      if (e < 1) tweenRef.current = requestAnimationFrame(run);
    };
    tweenRef.current = requestAnimationFrame(run);
  };

  const togglePlay = () => {
    if (engine.playing) {
      engine.pause();
      setPlaying(false);
      setStep(-1);
    } else {
      engine.play();
      setPlaying(true);
    }
  };

  const getLevel = useCallback(() => engine.getLevel(), [engine]);
  const shapeMeta = SHAPES.find((s) => s.id === shape);

  const openGame = () => {
    engine.pause();
    setPlaying(false);
    setStep(-1);
    player.pause();
    engine.allNotesOff();
    setGameOpen(true);
  };
  const closeGame = useCallback(() => {
    setGameOpen(false);
    player.stopAll();
  }, [player.stopAll]);
  const recordScore = useCallback((trackId: string, score: number) => {
    setBest((b) => {
      if (score <= (b[trackId] ?? 0)) return b;
      const next = { ...b, [trackId]: score };
      saveBest(next);
      return next;
    });
  }, []);
  const gameTrack = player.track;
  const onGameRecord = useCallback(
    (score: number) => recordScore(gameTrack.id, score),
    [recordScore, gameTrack.id],
  );
  const onGameBurst = useCallback((x: number, y: number) => {
    fieldRef.current?.shock(x, y);
    setShocks((s) => [...s.slice(-4), { id: performance.now(), x, y }]);
  }, []);
  const onChooseTrack = useCallback(() => {
    closeGame();
    setCollapsed(false);
  }, [closeGame]);

  const trackPanel = (
    <TrackPanel
      library={library}
      index={player.index}
      playing={player.playing}
      loop={player.loop}
      jam={jam}
      best={best}
      trackVolume={trackVolume}
      balance={balance}
      userTracks={userTracks}
      analysis={analysis}
      resultId={resultId}
      onResult={setResultId}
      onDeleteTrack={deleteTrack}
      getPosition={player.getPosition}
      onSelect={player.select}
      onPlayToggle={player.toggle}
      onPrev={player.prev}
      onNext={player.next}
      onLoop={player.toggleLoop}
      onJam={() => setJam((j) => !j)}
      onTrackVolume={setTrackVolume}
      onBalance={setBalance}
      onChallenge={openGame}
    />
  );

  const rail = (
    <div className="flex flex-col gap-4">
      <ScalePicker
        root={root}
        scale={scale}
        onRoot={setRoot}
        onScale={setScale}
        jamLabel={
          jamActive
            ? `${ROOTS[player.track.root]} ${getScale(player.track.scale).en}`
            : null
        }
      />
      <div className="border-t border-foreground/[0.08] pt-4">
        <ControlRail
          knobs={knobs}
          onKnob={setKnob}
          waveform={waveform}
          onWaveform={(w) => {
            setPresetId(null);
            setWaveform(w);
          }}
          shape={shape}
          onShape={(s) => {
            setPresetId(null);
            setShape(s);
          }}
          palette={palette}
          onPalette={(pl) => {
            setPresetId(null);
            setPalette(pl);
          }}
          presetId={presetId}
          onPreset={applyPreset}
          volume={volume}
          onVolume={setVolume}
          muted={muted}
          onMute={() => setMuted((m) => !m)}
        />
      </div>
    </div>
  );

  const playSurface = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:items-end xl:gap-8">
      <Sequencer
        grid={grid}
        drums={drums}
        pitches={sequencerPitches(root, scale)}
        step={step}
        playing={playing}
        bpm={bpm}
        onToggle={(r, s) =>
          setGrid((g) =>
            g.map((row, ri) =>
              ri === r ? row.map((c, si) => (si === s ? !c : c)) : row,
            ),
          )
        }
        onDrumToggle={(r, s) =>
          setDrums((g) =>
            g.map((row, ri) =>
              ri === r ? row.map((c, si) => (si === s ? !c : c)) : row,
            ),
          )
        }
        onPlayToggle={togglePlay}
        onBpm={setBpm}
        onClear={() => {
          setGrid(emptyGrid());
          setDrums(emptyDrums());
        }}
        onRandom={() => {
          setGrid(randomGrid());
          setDrums(randomDrums());
        }}
      />
      <Keyboard
        active={activeKeys}
        onDown={keyDown}
        onUp={keyUp}
        inScale={(m) => inScale(m, snapRoot, snapScale)}
      />
    </div>
  );

  const hideUi = collapsed || gameOpen;
  const panelHidden = hideUi ? "pointer-events-none opacity-0" : "opacity-100";

  return (
    <main
      className="relative h-[100dvh] w-full overflow-hidden bg-background"
      data-ocid="instrument.page"
    >
      <div
        ref={hostRef}
        className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing"
        data-ocid="field.canvas_target"
      />
      <p className="sr-only">
        粒子场：拖动旋转视角，滚轮或双指缩放，单击产生冲击波与打击音。
      </p>
      {!webgl && <WebGLFallback />}
      <div className="grain pointer-events-none absolute inset-0 z-[1]" />

      {shocks.map((s) => (
        <motion.span
          key={s.id}
          aria-hidden="true"
          className={cn(
            "pointer-events-none fixed size-12 rounded-full border-2 border-accent shadow-ring-halo",
            gameOpen ? "z-[41]" : "z-[2]",
          )}
          style={{ left: s.x - 24, top: s.y - 24 }}
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 9, opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          onAnimationComplete={() =>
            setShocks((all) => all.filter((x) => x.id !== s.id))
          }
        />
      ))}

      <AnimatePresence>
        {!started && <Hero onEnter={enter} starting={starting} />}
      </AnimatePresence>

      {started && (
        <>
          {!gameOpen && (
            <Hud
              note={note}
              bpm={player.playing ? player.track.bpm : bpm}
              shape={shapeMeta ? `${shapeMeta.zh} ${shapeMeta.en}` : ""}
              playing={playing || player.playing}
              muted={muted}
              bottomOffset={collapsed ? 0 : dockH}
              getLevel={getLevel}
            />
          )}

          <div
            className={cn(
              "fixed inset-x-0 top-4 z-30 flex justify-center pointer-events-none md:top-5",
              gameOpen && "hidden",
            )}
          >
            <div className="pointer-events-auto flex items-center gap-3 animate-fade-up">
              <span className="hidden select-none font-display text-sm font-bold tracking-[-0.04em] text-foreground lg:inline">
                RESON<span className="text-stroke">ANCE</span>
                <span className="font-serif-italic ml-1.5 text-base font-normal text-primary transition-colors duration-1000">
                  共振
                </span>
              </span>
              <button
                type="button"
                data-ocid="panel.toggle"
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((c) => !c)}
                className="glass flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] text-muted-foreground transition-[transform,color,border-color,background-color] duration-500 ease-out-expo hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
              >
                {isMobile ? (
                  collapsed ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )
                ) : collapsed ? (
                  <PanelRightOpen className="size-3.5" />
                ) : (
                  <PanelRightClose className="size-3.5" />
                )}
                {collapsed ? "展开面板" : "收起面板"}
              </button>
            </div>
          </div>

          {isMobile ? (
            <div
              ref={setDockEl}
              data-ocid="panel.sheet"
              className={cn(
                "glass fixed inset-x-0 bottom-0 z-20 max-h-[64dvh] overflow-y-auto rounded-t-xl border-x-0 border-b-0 px-4 pb-6 pt-2 shadow-elevated",
                "transition-[transform,opacity] duration-700 ease-out-expo",
                collapsed || gameOpen ? "translate-y-full" : "translate-y-0",
                panelHidden,
              )}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-foreground/20" />
              <div className="flex flex-col gap-5">
                {playSurface}
                <div className="border-t border-foreground/[0.08] pt-4">
                  {trackPanel}
                </div>
                <div className="border-t border-foreground/[0.08] pt-4">
                  {rail}
                </div>
              </div>
            </div>
          ) : (
            <>
              <aside
                data-ocid="tracks.sheet"
                aria-label="曲库 Track Library"
                className={cn(
                  "glass scrollbar-none fixed left-5 top-16 z-20 w-[272px] overflow-y-auto rounded-lg p-4 shadow-subtle",
                  "transition-[transform,opacity] duration-700 ease-out-expo",
                  hideUi ? "-translate-x-[120%]" : "translate-x-0",
                  panelHidden,
                )}
                style={{ bottom: dockH + 64 }}
              >
                {trackPanel}
              </aside>
              <aside
                data-ocid="panel.rail"
                className={cn(
                  "glass scrollbar-none fixed right-5 top-16 z-20 w-[264px] overflow-y-auto rounded-lg p-4 shadow-subtle",
                  "transition-[transform,opacity] duration-700 ease-out-expo",
                  hideUi ? "translate-x-[120%]" : "translate-x-0",
                  panelHidden,
                )}
                style={{ bottom: dockH + 64 }}
              >
                {rail}
              </aside>
              <div
                ref={setDockEl}
                data-ocid="panel.dock"
                className={cn(
                  "fixed inset-x-0 bottom-0 z-20 border-t border-foreground/[0.08] bg-gradient-to-t from-background/95 via-background/75 to-background/30 px-5 pb-5 pt-4 backdrop-blur-xl",
                  "transition-[transform,opacity] duration-700 ease-out-expo",
                  hideUi ? "translate-y-full" : "translate-y-0",
                  panelHidden,
                )}
              >
                {playSurface}
              </div>
            </>
          )}
          {gameOpen && (
            <RhythmGame
              engine={engine}
              song={song}
              track={gameTrack}
              best={best[gameTrack.id] ?? 0}
              onBurst={onGameBurst}
              onRecord={onGameRecord}
              onExit={closeGame}
              onChooseTrack={onChooseTrack}
            />
          )}
        </>
      )}
    </main>
  );
}
