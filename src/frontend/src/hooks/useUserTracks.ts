import {
  type Mode,
  type SongAnalysis,
  type UserTrackRecord,
  arrangeUserTrack,
  createRecord,
  loadUserTracks,
  saveUserTracks,
} from "@/lib/userTracks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface UserTrackSettings {
  bpm?: number;
  root?: number;
  mode?: Mode;
}

/** Browser-persisted generated tracks: add, rename, retune, delete. */
export function useUserTracks() {
  const [records, setRecords] = useState<UserTrackRecord[]>(loadUserTracks);
  const [persistFailed, setPersistFailed] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPersistFailed(!saveUserTracks(records));
  }, [records]);

  const tracks = useMemo(
    () => records.map((r) => arrangeUserTrack(r).track),
    [records],
  );

  const add = useCallback((analysis: SongAnalysis, fileName: string) => {
    const rec = createRecord(analysis, fileName);
    setRecords((list) => [...list, rec]);
    return rec;
  }, []);

  const rename = useCallback((id: string, name: string) => {
    const clean = name.trim().slice(0, 40);
    if (!clean) return;
    setRecords((list) =>
      list.map((r) => (r.id === id ? { ...r, name: clean } : r)),
    );
  }, []);

  const update = useCallback((id: string, settings: UserTrackSettings) => {
    setRecords((list) =>
      list.map((r) => (r.id === id ? { ...r, ...settings } : r)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setRecords((list) => list.filter((r) => r.id !== id));
  }, []);

  return { records, tracks, persistFailed, add, rename, update, remove };
}

export type UserTracksApi = ReturnType<typeof useUserTracks>;
