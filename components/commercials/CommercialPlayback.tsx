"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CommercialPlayerModal } from "@/components/commercials/CommercialPlayerModal";
import {
  COMMERCIAL_FORM_ANCHOR,
  COMMERCIAL_REFERENCE_EVENT,
  type Commercial,
} from "@/lib/commercials/constants";
import { usePreviewAllowed } from "@/lib/video/use-preview-allowed";

/** A video must be at least this visible to autoplay. */
export const PLAY_VISIBILITY = 0.5;
const MAX_PLAYING_MOBILE = 4;
const MAX_PLAYING_DESKTOP = 8;
const DESKTOP_QUERY = "(min-width: 1024px)";

export interface PlaybackEntry {
  getVideo: () => HTMLVideoElement | null;
  setActive: (active: boolean) => void;
}

interface Tracked extends PlaybackEntry {
  ratio: number;
  active: boolean;
}

interface CommercialPlaybackApi {
  /** False for reduced motion / Save-Data (and before hydration): show posters, never autoplay. */
  autoplay: boolean;
  soundId: string | null;
  /** True while the fullscreen player modal is open. */
  playerOpen: boolean;
  register: (id: string, entry: PlaybackEntry) => () => void;
  reportVisibility: (id: string, ratio: number) => void;
  /** Must run inside the tap handler so iOS treats the unmute as a user gesture. Returns true if `id` now has sound. */
  toggleSound: (id: string) => boolean;
  releaseSound: (id: string) => void;
  openPlayer: (commercial: Commercial) => void;
}

const noop = () => {};
const STATIC_API: CommercialPlaybackApi = {
  autoplay: false,
  soundId: null,
  playerOpen: false,
  register: () => noop,
  reportVisibility: noop,
  toggleSound: () => false,
  releaseSound: noop,
  openPlayer: noop,
};

const PlaybackContext = createContext<CommercialPlaybackApi>(STATIC_API);

export function useCommercialPlayback(): CommercialPlaybackApi {
  return useContext(PlaybackContext);
}

/**
 * Coordinates every inline commercial video on the page: only the most visible
 * ones play (capped per device), only one has sound, and all pause while the
 * fullscreen player is open.
 */
export function CommercialPlaybackProvider({ children }: { children: ReactNode }) {
  const autoplay = usePreviewAllowed();
  const [soundId, setSoundId] = useState<string | null>(null);
  const [open, setOpen] = useState<Commercial | null>(null);
  const entries = useRef(new Map<string, Tracked>());
  const soundRef = useRef<string | null>(null);
  const capRef = useRef(MAX_PLAYING_MOBILE);
  const haltedRef = useRef(true);
  const frameRef = useRef(0);

  const recompute = useCallback(() => {
    frameRef.current = 0;
    const winners = new Set<string>();
    if (!haltedRef.current) {
      Array.from(entries.current.entries())
        .filter(([, e]) => e.ratio >= PLAY_VISIBILITY)
        .sort(([idA, a], [idB, b]) => {
          if (idA === soundRef.current) return -1;
          if (idB === soundRef.current) return 1;
          return b.ratio - a.ratio;
        })
        .slice(0, capRef.current)
        .forEach(([id]) => winners.add(id));
    }
    entries.current.forEach((entry, id) => {
      const active = winners.has(id);
      if (active !== entry.active) {
        entry.active = active;
        entry.setActive(active);
      }
    });
  }, []);

  const schedule = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(recompute);
  }, [recompute]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const sync = () => {
      capRef.current = desktop.matches ? MAX_PLAYING_DESKTOP : MAX_PLAYING_MOBILE;
      schedule();
    };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, [schedule]);

  useEffect(() => {
    haltedRef.current = !autoplay || open !== null;
    recompute();
  }, [autoplay, open, recompute]);

  const setSound = useCallback((next: string | null) => {
    entries.current.forEach((entry, id) => {
      const video = entry.getVideo();
      if (video) video.muted = id !== next;
    });
    soundRef.current = next;
    setSoundId(next);
  }, []);

  const register = useCallback(
    (id: string, entry: PlaybackEntry) => {
      entries.current.set(id, { ...entry, ratio: 0, active: false });
      return () => {
        entries.current.delete(id);
        if (soundRef.current === id) {
          soundRef.current = null;
          setSoundId(null);
        }
        schedule();
      };
    },
    [schedule]
  );

  const reportVisibility = useCallback(
    (id: string, ratio: number) => {
      const entry = entries.current.get(id);
      if (!entry) return;
      entry.ratio = ratio;
      schedule();
    },
    [schedule]
  );

  const toggleSound = useCallback(
    (id: string) => {
      const next = soundRef.current === id ? null : id;
      setSound(next);
      return next === id;
    },
    [setSound]
  );

  const releaseSound = useCallback(
    (id: string) => {
      if (soundRef.current === id) setSound(null);
    },
    [setSound]
  );

  const openPlayer = useCallback(
    (commercial: Commercial) => {
      setSound(null);
      setOpen(commercial);
    },
    [setSound]
  );

  const close = useCallback(() => setOpen(null), []);
  const wantOne = useCallback((c: Commercial) => {
    setOpen(null);
    window.dispatchEvent(new CustomEvent(COMMERCIAL_REFERENCE_EVENT, { detail: { id: c.id } }));
    requestAnimationFrame(() => {
      document.getElementById(COMMERCIAL_FORM_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const api = useMemo<CommercialPlaybackApi>(
    () => ({
      autoplay,
      soundId,
      playerOpen: open !== null,
      register,
      reportVisibility,
      toggleSound,
      releaseSound,
      openPlayer,
    }),
    [autoplay, soundId, open, register, reportVisibility, toggleSound, releaseSound, openPlayer]
  );

  return (
    <PlaybackContext.Provider value={api}>
      {children}
      {open && <CommercialPlayerModal commercial={open} onClose={close} onWantOne={wantOne} />}
    </PlaybackContext.Provider>
  );
}
