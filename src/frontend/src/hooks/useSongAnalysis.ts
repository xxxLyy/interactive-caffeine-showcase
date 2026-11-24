import {
  AnalysisError,
  type AnalysisErrorKind,
  analyzeSong,
} from "@/audio/analyze";
import type { SongAnalysis } from "@/lib/userTracks";
import { useCallback, useEffect, useRef, useState } from "react";

export type AnalysisState =
  | { status: "idle" }
  | { status: "running"; fileName: string; stage: number; progress: number }
  | {
      status: "error";
      fileName: string;
      kind: AnalysisErrorKind;
      message: string;
    };

/** Staged, cancellable client-side analysis of one uploaded file at a time. */
export function useSongAnalysis(
  onDone: (analysis: SongAnalysis, fileName: string) => void,
) {
  const [state, setState] = useState<AnalysisState>({ status: "idle" });
  const ctrlRef = useRef<AbortController | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const start = useCallback(async (file: File) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const fileName = file.name;
    setState({ status: "running", fileName, stage: 0, progress: 0 });
    try {
      const analysis = await analyzeSong(file, {
        signal: ctrl.signal,
        onProgress: (stage, progress) => {
          if (!ctrl.signal.aborted)
            setState({ status: "running", fileName, stage, progress });
        },
      });
      if (ctrl.signal.aborted) return;
      ctrlRef.current = null;
      setState({ status: "idle" });
      doneRef.current(analysis, fileName);
    } catch (err) {
      if (ctrl.signal.aborted) return;
      ctrlRef.current = null;
      const known = err instanceof AnalysisError ? err : null;
      setState({
        status: "error",
        fileName,
        kind: known?.kind ?? "decode",
        message: known?.message ?? new AnalysisError("decode").message,
      });
    }
  }, []);

  const cancel = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = null;
    setState({ status: "idle" });
  }, []);

  const dismiss = useCallback(() => setState({ status: "idle" }), []);

  useEffect(() => () => ctrlRef.current?.abort(), []);

  return { state, start, cancel, dismiss };
}

export type SongAnalysisApi = ReturnType<typeof useSongAnalysis>;
