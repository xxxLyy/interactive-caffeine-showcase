import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { BestScores } from "@/lib/game";
import { ROOTS, getScale } from "@/lib/scales";
import type { Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import {
  AudioLines,
  Check,
  Pencil,
  SlidersHorizontal,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { useState } from "react";
import { EqBars, trackRowClass } from "./EqBars";

interface UserTrackListProps {
  /** Built-in demo, always listed first and never removable. */
  demo: Track;
  tracks: Track[];
  /** Library index of the demo; user tracks follow it. */
  offset: number;
  activeIndex: number;
  playing: boolean;
  best: BestScores;
  tunedId: string | null;
  persistFailed: boolean;
  onSelect: (index: number) => void;
  onRename: (id: string, name: string) => void;
  onTune: (id: string) => void;
  onDelete: (id: string) => void;
  onUpload: () => void;
}

const iconBtn =
  "grid size-6 place-items-center rounded-full text-muted-foreground transition-ui hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-90";

interface RowBodyProps {
  track: Track;
  tag: "demo" | "user";
  active: boolean;
  playing: boolean;
  best: number | undefined;
}

/** Shared row content: origin tag, name, key/tempo readout, live EQ or best score. */
function RowBody({ track: t, tag, active, playing, best }: RowBodyProps) {
  return (
    <>
      {tag === "demo" ? (
        <span className="readout shrink-0 rounded-[3px] border border-primary/45 bg-primary/10 px-1 py-px text-[8px] text-primary">
          示范 Demo
        </span>
      ) : (
        <span className="user-track-tag readout rounded-[3px] px-1 py-px text-[8px]">
          User
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{t.zh}</span>
        <span className="readout block truncate text-[9px] text-muted-foreground transition-colors duration-300 group-hover:text-foreground/80">
          {ROOTS[t.root]} {getScale(t.scale).en} · {t.bpm} BPM
        </span>
      </span>
      {active && playing ? (
        <EqBars live />
      ) : best ? (
        <span
          className="readout flex items-center gap-1 text-[9px] text-rank-s"
          title="最佳成绩 Best"
        >
          <Trophy className="size-3" />
          {best.toLocaleString()}
        </span>
      ) : null}
    </>
  );
}

/** 我的曲目: generated tracks with play, rename, fine-tune and confirmed delete; guided empty state. */
export function UserTrackList(p: UserTrackListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);

  const saveRename = (id: string) => {
    if (draft.trim()) p.onRename(id, draft);
    setEditing(null);
  };

  return (
    <section className="flex flex-col gap-1.5" data-ocid="mytracks.section">
      <h3 className="flex items-baseline justify-between px-0.5">
        <span className="text-sm font-medium text-foreground">我的曲目</span>
        <span className="readout text-[9px] text-muted-foreground">
          My Tracks · {p.tracks.length + 1}
        </span>
      </h3>

      <ol className="flex flex-col gap-1" data-ocid="mytracks.list">
        <li>
          <button
            type="button"
            aria-current={p.offset === p.activeIndex ? "true" : undefined}
            title="内置示范曲目，始终保留 Built-in demo"
            data-ocid="mytracks.demo.item"
            onClick={() => p.onSelect(p.offset)}
            className={trackRowClass(p.offset === p.activeIndex)}
          >
            <RowBody
              track={p.demo}
              tag="demo"
              active={p.offset === p.activeIndex}
              playing={p.playing}
              best={p.best[p.demo.id]}
            />
          </button>
        </li>
        {p.tracks.map((t, i) => {
          const index = p.offset + 1 + i;
          const active = index === p.activeIndex;
          const n = i + 1;
          if (editing === t.id)
            return (
              <li key={t.id}>
                <form
                  className="flex items-center gap-1 rounded-md border border-primary/40 px-2 py-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveRename(t.id);
                  }}
                >
                  <label htmlFor={`rename-${t.id}`} className="sr-only">
                    曲目名称 Track name
                  </label>
                  <input
                    id={`rename-${t.id}`}
                    // biome-ignore lint/a11y/noAutofocus: rename was explicitly requested
                    autoFocus
                    value={draft}
                    maxLength={40}
                    data-ocid={`mytracks.rename.input.${n}`}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="保存名称 Save"
                    disabled={!draft.trim()}
                    data-ocid={`mytracks.save_button.${n}`}
                    className={cn(iconBtn, "text-accent disabled:opacity-40")}
                  >
                    <Check className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="取消重命名 Cancel"
                    data-ocid={`mytracks.cancel_button.${n}`}
                    onClick={() => setEditing(null)}
                    className={iconBtn}
                  >
                    <X className="size-3.5" />
                  </button>
                </form>
              </li>
            );
          return (
            <li key={t.id} className="group/row relative flex items-center">
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                data-ocid={`mytracks.item.${n}`}
                onClick={() => p.onSelect(index)}
                className={cn(trackRowClass(active), "pr-[84px]")}
              >
                <RowBody
                  track={t}
                  tag="user"
                  active={active}
                  playing={p.playing}
                  best={p.best[t.id]}
                />
              </button>
              <span className="absolute right-1.5 flex items-center opacity-100 transition-opacity duration-300 md:opacity-0 md:group-focus-within/row:opacity-100 md:group-hover/row:opacity-100">
                <button
                  type="button"
                  aria-label={`微调 ${t.zh}`}
                  aria-pressed={p.tunedId === t.id}
                  data-ocid={`mytracks.edit_button.${n}`}
                  onClick={() => p.onTune(t.id)}
                  className={cn(iconBtn, p.tunedId === t.id && "text-accent")}
                >
                  <SlidersHorizontal className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`重命名 ${t.zh}`}
                  data-ocid={`mytracks.rename_button.${n}`}
                  onClick={() => {
                    setDraft(t.zh);
                    setEditing(t.id);
                  }}
                  className={iconBtn}
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label={`删除 ${t.zh}`}
                  data-ocid={`mytracks.delete_button.${n}`}
                  onClick={() => setPendingDelete(t)}
                  className={cn(
                    iconBtn,
                    "hover:bg-destructive/15 hover:text-destructive",
                  )}
                >
                  <Trash2 className="size-3" />
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      {p.tracks.length === 0 && (
        <div
          className="hairline flex flex-col items-center rounded-lg border border-dashed px-3 py-4 text-center"
          data-ocid="mytracks.empty_state"
        >
          <AudioLines className="size-5 text-accent animate-breathe" />
          <p className="mt-2 text-sm text-foreground">还没有你上传的曲目</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            先听听上面的示范，再上传一首喜欢的歌，共振会识别它的节拍、调性与和弦，生成一段专属的器乐演奏。
          </p>
          <button
            type="button"
            data-ocid="mytracks.upload_button"
            onClick={p.onUpload}
            className="user-track-tag mt-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] transition-ui hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          >
            <Upload className="size-3" />
            上传第一首歌
          </button>
        </div>
      )}

      {p.persistFailed && (
        <p
          className="readout text-[9px] text-destructive"
          data-ocid="mytracks.error_state"
        >
          浏览器存储已满，新曲目只保留到关闭页面
        </p>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent
          className="glass rounded-lg border-0 shadow-elevated"
          data-ocid="mytracks.delete.dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-[-0.03em]">
              删除「{pendingDelete?.zh}」？
            </AlertDialogTitle>
            <AlertDialogDescription>
              生成的编曲和它的挑战最高分会从这个浏览器中移除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full"
              data-ocid="mytracks.delete.cancel_button"
            >
              保留
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="mytracks.delete.confirm_button"
              onClick={() => {
                if (pendingDelete) p.onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              删除曲目
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
