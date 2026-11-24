import { ACCEPT, ANALYSIS_STAGES } from "@/audio/analyze";
import type { SongAnalysisApi } from "@/hooks/useSongAnalysis";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, RotateCcw, Upload, X } from "lucide-react";
import { type DragEvent, type RefObject, useState } from "react";
import { PillButton } from "./PillButton";

const WAVE = Array.from({ length: 9 }, (_, i) => ({
  id: `w-${i}`,
  h: [0.35, 0.6, 0.45, 0.8, 1, 0.7, 0.9, 0.55, 0.4][i],
}));

/** 上传歌曲: dropzone, staged analysis progress with cancel, and recoverable error state. */
export function UploadZone({
  analysis,
  inputRef,
}: {
  analysis: SongAnalysisApi;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const [dragging, setDragging] = useState(false);
  const { state, start, cancel, dismiss } = analysis;
  const running = state.status === "running";

  const pick = () => inputRef.current?.click();
  const take = (file: File | undefined) => {
    if (file) void start(file);
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (!running) setDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null))
      setDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!running) take(e.dataTransfer.files[0]);
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      data-ocid="upload.input"
      onChange={(e) => {
        take(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (state.status === "running") {
    const overall = (state.stage + state.progress) / ANALYSIS_STAGES.length;
    return (
      <div
        key="running"
        className="hairline animate-card-reveal rounded-lg border bg-background/40 p-3"
        data-ocid="upload.loading_state"
        aria-live="polite"
      >
        {input}
        <p className="readout truncate text-[9px] text-muted-foreground">
          分析中 Analysing ·{" "}
          <span className="text-foreground">{state.fileName}</span>
        </p>
        <ol className="relative mt-3 flex flex-col gap-2.5">
          <span
            aria-hidden="true"
            className="absolute bottom-2 left-[5px] top-2 w-px bg-foreground/10"
          />
          {ANALYSIS_STAGES.map((s, i) => {
            const status =
              i < state.stage ? "done" : i === state.stage ? "active" : "idle";
            return (
              <li
                key={s.id}
                className="relative flex items-center gap-3"
                aria-current={status === "active" ? "step" : undefined}
                data-ocid={`upload.step.${i + 1}`}
              >
                <span
                  key={status}
                  className={cn(
                    "relative grid size-[11px] place-items-center rounded-full",
                    status === "done" && "step-done animate-step-tick",
                    status === "active" && "step-active animate-halo-pulse",
                    status === "idle" && "step-idle",
                  )}
                >
                  {status === "done" && (
                    <Check className="size-2 text-background" strokeWidth={4} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm transition-colors duration-500",
                    status === "idle"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {s.zh}
                </span>
                <span
                  className={cn(
                    "readout text-[9px] transition-colors duration-500",
                    status === "active"
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {s.en}
                </span>
                {status === "active" && (
                  <span className="readout ml-auto text-[9px] text-foreground">
                    {Math.round(state.progress * 100)}%
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex items-end gap-2">
          <div
            className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            <div
              className="progress-hairline absolute inset-0 origin-left transition-transform duration-500 ease-out-expo"
              style={{ transform: `scaleX(${overall})` }}
            />
            <div className="analysis-sweep animate-analysis-sweep absolute inset-0" />
          </div>
          <span className="flex h-4 items-end gap-[2px]" aria-hidden="true">
            {WAVE.map((w, i) => (
              <span
                key={w.id}
                className="w-[2px] origin-bottom rounded-[1px] bg-accent animate-wave-rise"
                style={{
                  height: `${w.h * 100}%`,
                  opacity: i <= overall * WAVE.length ? 1 : 0.25,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </span>
        </div>
        <div className="mt-2.5 flex justify-end">
          <PillButton
            size="sm"
            data-ocid="upload.cancel_button"
            onClick={cancel}
            className="h-7"
          >
            <X className="size-3" />
            取消 <span className="readout text-[9px]">Cancel</span>
          </PillButton>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        key="error"
        role="alert"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "dropzone dropzone-error animate-card-reveal rounded-lg p-3",
          dragging && "dropzone-active",
        )}
        data-ocid="upload.error_state"
      >
        {input}
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
          分析失败
          <span className="readout text-[9px] text-muted-foreground">
            Failed
          </span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-foreground/85">
          {state.message}
        </p>
        <p className="readout mt-1 truncate text-[9px] text-muted-foreground">
          {state.fileName}
        </p>
        <div className="mt-3 flex gap-1.5">
          <PillButton
            size="sm"
            active
            data-ocid="upload.retry_button"
            onClick={pick}
            className="flex-1"
          >
            <RotateCcw className="size-3" />
            重试 <span className="readout text-[9px]">Retry</span>
          </PillButton>
          <PillButton
            size="sm"
            data-ocid="upload.close_button"
            onClick={dismiss}
          >
            返回
          </PillButton>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragEnter={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {input}
      <button
        type="button"
        onClick={pick}
        data-ocid="upload.dropzone"
        aria-label="上传歌曲 Upload：点击选择或拖放音频文件"
        className={cn(
          "dropzone group flex w-full flex-col items-center rounded-lg px-3 py-4 text-center",
          "hover:animate-dash-march focus-visible:animate-dash-march hover:bg-primary/[0.05]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
          dragging && "dropzone-active animate-dash-march",
        )}
      >
        <Upload
          className={cn(
            "size-4 text-muted-foreground transition-[transform,color] duration-500 ease-spring group-hover:-translate-y-0.5 group-hover:text-primary",
            dragging && "-translate-y-1 text-primary",
          )}
        />
        <span className="mt-1.5 font-display text-lg font-bold leading-none tracking-[-0.03em] text-foreground">
          {dragging ? "松开以分析" : "上传歌曲"}
        </span>
        <span className="font-serif-italic text-base leading-tight text-muted-foreground transition-colors duration-500 group-hover:text-foreground">
          {dragging ? "Drop to analyse" : "Upload"}
        </span>
        <span className="readout mt-2 text-[8px] text-muted-foreground">
          MP3 · WAV · M4A · OGG ≤ 20MB
        </span>
      </button>
    </div>
  );
}
