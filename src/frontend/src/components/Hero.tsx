import { motion } from "motion/react";
import { MagneticButton } from "./MagneticButton";

interface HeroProps {
  onEnter: () => void;
  starting: boolean;
}

function Chars({ text, delay }: { text: string; delay: number }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span
          key={`${text}-${ch}-${delay + i}`}
          className="inline-block animate-char-rise"
          style={{ animationDelay: `${delay + i * 40}ms` }}
        >
          {ch}
        </span>
      ))}
    </>
  );
}

/** Opening wordmark with staggered letters and the entry ritual CTA. */
export function Hero({ onEnter, starting }: HeroProps) {
  return (
    <motion.section
      data-ocid="hero.section"
      className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-center px-6 md:px-14"
      exit={{
        opacity: 0,
        scale: 0.55,
        y: "-38vh",
        x: "-10vw",
        filter: "blur(18px)",
      }}
      transition={{ duration: 1.1, ease: [0.83, 0, 0.17, 1] }}
    >
      <p className="readout mb-6 flex items-center gap-3 text-muted-foreground animate-fade-up">
        <span className="size-1.5 rounded-full bg-accent animate-breathe" />
        N°01 — Audiovisual Instrument / 视听粒子合成器
      </p>

      <h1
        aria-label="RESONANCE 共振"
        className="relative select-none font-display font-bold leading-[0.8] tracking-[-0.055em]"
      >
        <span
          aria-hidden="true"
          className="relative block text-[23vw] text-foreground md:text-[15.5vw]"
        >
          <span className="text-stroke-primary absolute left-[0.05em] top-[0.04em] -z-10 opacity-60">
            RESON
          </span>
          <Chars text="RESON" delay={120} />
        </span>
        <span
          aria-hidden="true"
          className="text-stroke block pl-[9vw] text-[23vw] md:pl-[14vw] md:text-[15.5vw]"
        >
          <Chars text="ANCE" delay={340} />
        </span>
        <span
          aria-hidden="true"
          className="font-serif-italic absolute -bottom-[0.2em] right-[2vw] text-[30vw] leading-none tracking-normal text-primary drop-shadow-[0_0_40px_oklch(var(--primary)/0.55)] transition-colors duration-1000 md:right-[8vw] md:top-[0.12em] md:bottom-auto md:text-[19vw]"
        >
          <Chars text="共振" delay={620} />
        </span>
      </h1>

      <div
        className="pointer-events-auto mt-[12vh] flex flex-col items-start gap-5 animate-fade-up sm:flex-row sm:items-center sm:gap-8 md:mt-14"
        style={{ animationDelay: "900ms" }}
      >
        <MagneticButton
          onClick={onEnter}
          ocid="hero.primary_button"
          disabled={starting}
        >
          <span className="font-display text-base font-medium tracking-tight">
            点击进入
          </span>
          <span className="h-4 w-px bg-foreground/30" />
          <span className="readout text-accent">
            {starting ? "启动中…" : "启动声音"}
          </span>
        </MagneticButton>
        <p className="max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
          <span className="font-serif-italic text-lg text-foreground/90">
            Touch the field, play the light.
          </span>
          <br />
          触碰粒子场，用声音塑造光。建议佩戴耳机。
        </p>
      </div>
    </motion.section>
  );
}
