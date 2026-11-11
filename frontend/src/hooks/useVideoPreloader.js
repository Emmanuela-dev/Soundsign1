// ─────────────────────────────────────────────────────────────────────────────
// useVideoPreloader.js
//
// Pre-fetches every sign-language video clip as a Blob and stores a local
// objectURL in VIDEO_CACHE.  Because the objectURL points to memory, the
// <video> element skips all network/disk I/O and reaches readyState 4
// (HAVE_ENOUGH_DATA) instantly — zero load latency for every clip.
//
// Usage
//   1. Call useVideoPreloader() once at the top of App.
//   2. In ISLVideoPlayer, call getCachedSrc(publicPath) to get the blob URL
//      (falls back to the original path if the clip hasn't loaded yet).
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

// Module-level cache — shared across all components, persists for the session
export const VIDEO_CACHE = new Map(); // publicPath → objectURL

/** Return cached blob URL if ready, otherwise the original public path */
export const getCachedSrc = (publicPath) =>
  VIDEO_CACHE.has(publicPath) ? VIDEO_CACHE.get(publicPath) : publicPath;

// ── Build the full list of all 151 video paths ────────────────────────────────

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = ["0","1","2","3","4","5","6","7","8","9"];
const WORDS   = [
  "After","Again","Against","Age","All","Alone","Also","And","Ask","At",
  "Be","Beautiful","Before","Best","Better","Busy","But","Bye",
  "Can","Cannot","Change","College","Come","Computer",
  "Day","Distance","Do","Do Not","Does Not",
  "Eat","Engineer","Fight","Finish","From","Glitter",
  "Go","God","Gold","Good","Great",
  "Hand","Hands","Happy","Hello","Help","Her","Here","His","Home","Homepage","How",
  "Invent","It","Keep","Language","Laugh","Learn",
  "Me","More","My","Name","Next","Not","Now",
  "Of","On","Our","Out","Pretty","Right","Sad","Safe","See","Self",
  "Sign","Sing","So","Sound","Stay","Study",
  "Talk","Television","Thank","Thank You","That","They","This","Those","Time","To","Type",
  "Us","Walk","Wash","Way","We","Welcome","What","When","Where","Which",
  "Who","Whole","Whose","Why","Will","With","Without","Words","Work","World","Wrong",
  "You","Your","Yourself",
];

const ALL_PATHS = [
  ...LETTERS.map((l) => `/videos/letters/${l}.mp4`),
  ...NUMBERS.map((n) => `/videos/numbers/${n}.mp4`),
  ...WORDS.map((w)   => `/videos/words/${w}.mp4`),
];

// Total: 26 + 10 + 115 = 151

// ── Fetch one clip and store in cache ─────────────────────────────────────────
const cacheOne = async (path) => {
  if (VIDEO_CACHE.has(path)) return;          // already cached
  try {
    const res  = await fetch(path);
    if (!res.ok) return;                      // missing file — skip silently
    const blob = await res.blob();
    VIDEO_CACHE.set(path, URL.createObjectURL(blob));
  } catch {
    // Network / CORS error — skip, player will fall back to public path
  }
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useVideoPreloader = () => {
  const [loaded, setLoaded]     = useState(0);
  const [complete, setComplete] = useState(false);
  const total = ALL_PATHS.length;

  useEffect(() => {
    let cancelled = false;
    let done = 0;

    const run = async () => {
      // Fire all fetches in parallel — browser limits concurrent requests
      // so this naturally batches without us having to throttle.
      const tasks = ALL_PATHS.map((path) =>
        cacheOne(path).then(() => {
          if (!cancelled) {
            done += 1;
            setLoaded(done);
            if (done === total) setComplete(true);
          }
        })
      );
      await Promise.allSettled(tasks);
    };

    run();
    return () => { cancelled = true; };
  }, []);

  return { loaded, total, complete };
};
