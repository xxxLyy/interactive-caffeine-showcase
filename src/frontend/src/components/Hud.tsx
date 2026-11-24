import { cn } from "@/lib/utils";
import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";

interface HudProps {
  note: string;
  bpm: number;
  shape: string;
  playing: boolean;
  muted: boolean;
  bottomOffset: number;
  getLevel: () => { level: number; db: number };
}

const BARS = Array.from({ length: 12 }, (_, i) => `bar-${i}`);

function Bracket({
  children,
  className,
  ocid,
  style,
}: {
  children: ReactNode;
  className?: string;
  ocid: string;
  style?: CSSProperties;
}) {
  return (
    <div
      data-ocid={ocid}
      style={style}
      className={cn(
        "readout pointer-events-none fixed z-20 flex items-center gap-2 px-2.5 py-1.5 text-muted-foreground transition-[bottom] duration-700 ease-out-expo",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:border-y before:border-l before:border-foreground/40 before:content-['']",
        "after:absolute after:inset-y-0 after:right-0 after:w-1.5 after:border-y after:border-r after:border-foreground/40 after:content-['']",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Four live corner readouts: NOTE, BPM, FORM, ENERGY (meter updated per frame). */
export function Hud({
  note,
  bpm,
  shape,
  playing,
  muted,
  bottomOffset,
  getLevel,
}: HudProps) {
  const bottom = bottomOffset + 16;
  const barsRef = useRef<HTMLDivElement>(null);
  const dbRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    let frame = 0;
    const tick = () => {
      const { level, db } = getLevel();
      smooth += (level - smooth) * (level > smooth ? 0.5 : 0.08);
      const bars = barsRef.current?.children;
      if (bars) {
        const lit = Math.round(smooth * bars.length);
        for (let i = 0; i < bars.length; i++) {
          (bars[i] as HTMLElement).style.opacity = i < lit ? "1" : "0.18";
        }
      }
      frame++;
      if (dbRef.current && frame % 6 === 0) {
        dbRef.current.textContent = db <= -59 ? "−∞ dB" : `${db.toFixed(0)} dB`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [getLevel]);

  return (
    <>
      <Bracket
        ocid="hud.note.panel"
        className="left-4 top-4 md:left-5 md:top-5"
      >
        <span>{"Note //"}</span>
        <span
          key={note}
          className="text-foreground animate-fade-up [animation-duration:300ms]"
        >
          {note}
        </span>
      </Bracket>
      <Bracket
        ocid="hud.bpm.panel"
        className="right-4 top-4 md:right-5 md:top-5"
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            playing
              ? "bg-primary animate-scan-blink"
              : "bg-muted-foreground/40",
          )}
        />
        <span>{"BPM //"}</span>
        <span className="text-foreground">{bpm.toFixed(1)}</span>
      </Bracket>
      <Bracket
        ocid="hud.form.panel"
        className="left-4 md:left-5"
        style={{ bottom }}
      >
        <span>{"Form //"}</span>
        <span
          key={shape}
          className="text-foreground animate-fade-up [animation-duration:400ms]"
        >
          {shape}
        </span>
      </Bracket>
      <Bracket
        ocid="hud.energy.panel"
        className="right-4 md:right-5"
        style={{ bottom }}
      >
        <span>{muted ? "Muted //" : "Energy //"}</span>
        <div
          ref={barsRef}
          className="flex h-2.5 items-end gap-[2px]"
          aria-hidden="true"
        >
          {BARS.map((id, i) => (
            <span
              key={id}
              className={cn(
                "w-[3px] rounded-[1px] transition-opacity duration-100",
                i > 8 ? "bg-primary" : "bg-accent",
              )}
              style={{
                height: `${35 + (i / BARS.length) * 65}%`,
                opacity: 0.18,
              }}
            />
          ))}
        </div>
        <span ref={dbRef} className="w-12 text-right text-foreground">
          −∞ dB
        </span>
      </Bracket>
    </>
  );
}
