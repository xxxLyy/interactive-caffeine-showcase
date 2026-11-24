import { KEY_HIGH, KEY_LOW, KEY_MAP } from "@/lib/instrument";
import { useEffect, useRef } from "react";

/** Maps A W S E D F T G Y H U J K O L P ; ' to notes from C4; Shift raises an octave. */
export function useComputerKeyboard(
  enabled: boolean,
  onDown: (midi: number) => void,
  onUp: (midi: number) => void,
) {
  const handlers = useRef({ onDown, onUp });
  handlers.current = { onDown, onUp };

  useEffect(() => {
    if (!enabled) return;
    const held = new Map<string, number>();
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== "range") ||
        target?.isContentEditable;
      if (typing) return;
      const off = KEY_MAP[e.code];
      if (off === undefined || held.has(e.code)) return;
      const midi = KEY_LOW + off + (e.shiftKey ? 12 : 0);
      if (midi > KEY_HIGH) return;
      e.preventDefault();
      held.set(e.code, midi);
      handlers.current.onDown(midi);
    };
    const up = (e: KeyboardEvent) => {
      const midi = held.get(e.code);
      if (midi === undefined) return;
      held.delete(e.code);
      handlers.current.onUp(midi);
    };
    const blur = () => {
      for (const midi of held.values()) handlers.current.onUp(midi);
      held.clear();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      blur();
    };
  }, [enabled]);
}
