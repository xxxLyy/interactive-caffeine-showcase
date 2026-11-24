import type { SongPlayer } from "@/audio/song";
import type { Track } from "@/lib/tracks";
import { useCallback, useEffect, useRef, useState } from "react";

/** Library transport over a SongPlayer (built-in + user tracks): select, play/pause, prev/next, loop, auto-advance. */
export function useTrackPlayer(
  song: SongPlayer,
  library: Track[],
  onTrackStart: (track: Track) => void,
) {
  const [id, setId] = useState(library[0].id);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const startRef = useRef(onTrackStart);
  startRef.current = onTrackStart;
  const libRef = useRef(library);
  libRef.current = library;

  const found = library.findIndex((t) => t.id === id);
  const index = Math.max(0, found);
  const track = library[index];
  const indexRef = useRef(index);
  indexRef.current = index;

  const select = useCallback(
    (i: number) => {
      const lib = libRef.current;
      const n = ((i % lib.length) + lib.length) % lib.length;
      const t = lib[n];
      setId(t.id);
      song.load(t);
      song.play();
      setPlaying(song.playing);
      startRef.current(t);
    },
    [song],
  );

  const selectId = useCallback(
    (trackId: string) => {
      const i = libRef.current.findIndex((t) => t.id === trackId);
      if (i >= 0) select(i);
    },
    [select],
  );

  useEffect(() => {
    song.loop = loop;
  }, [song, loop]);

  useEffect(() => {
    song.onEnd = () => select(indexRef.current + 1);
  }, [song, select]);

  // Current track deleted: stop it and fall back to the first track.
  useEffect(() => {
    if (found >= 0) return;
    if (song.track?.id === id) {
      song.stop();
      song.track = null;
      setPlaying(false);
    }
    setId(library[0].id);
  }, [found, id, library, song]);

  // Current track re-arranged (BPM / key edits): reload, keep playing.
  useEffect(() => {
    if (!song.track || song.track.id !== track.id || song.track === track)
      return;
    const was = song.playing;
    song.load(track);
    if (was) song.play();
    setPlaying(song.playing);
    startRef.current(track);
  }, [song, track]);

  const toggle = useCallback(() => {
    if (song.playing) {
      song.pause();
      setPlaying(false);
      return;
    }
    const current = libRef.current[indexRef.current];
    if (song.track !== current) {
      select(indexRef.current);
      return;
    }
    song.play();
    setPlaying(song.playing);
    startRef.current(current);
  }, [song, select]);

  const pause = useCallback(() => {
    song.pause();
    setPlaying(false);
  }, [song]);

  const stopAll = useCallback(() => {
    song.stop();
    song.track = null;
    setPlaying(false);
  }, [song]);

  const getPosition = useCallback(
    () =>
      song.track?.id === libRef.current[indexRef.current].id
        ? song.position()
        : 0,
    [song],
  );

  return {
    index,
    track,
    playing,
    loop,
    select,
    selectId,
    toggle,
    pause,
    stopAll,
    prev: () => select(index - 1),
    next: () => select(index + 1),
    toggleLoop: () => setLoop((l) => !l),
    getPosition,
  };
}
