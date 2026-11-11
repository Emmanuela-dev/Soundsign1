import React, { useState, useRef, useEffect, useCallback } from "react";
import { Hand } from "lucide-react";
import { getVideoSource } from "./videoUtils";
import { getCachedSrc } from "../hooks/useVideoPreloader";

// ─────────────────────────────────────────────────────────────────────────────
// ISLVideoPlayer — zero-latency real-time sign player
//
// Race-condition fix
// ──────────────────
// Previous bug: the drain loop checked queue.length === 0 then called
// sleepUntilItem(). If notify() fired in the tiny gap BEFORE the promise
// resolver was stored in notifyRef, the wake was lost and the loop slept
// forever on that item.
//
// Fix: two-layer wake system:
//   Layer 1 — event-driven: notify() resolves the sleep promise instantly.
//   Layer 2 — safety poll: a 40 ms setInterval kicks the loop if items sit
//             in the queue unplayed (catches any missed notify).
// The loop also re-checks the queue immediately after waking before going
// back to sleep, eliminating the gap window entirely.
//
// Vocabulary fix
// ──────────────
// videoUtils now fingerspells ALL unknown words, so the queue is never
// empty mid-sentence. The loop therefore stays active throughout speech.
// ─────────────────────────────────────────────────────────────────────────────

// ── Playback tuning constants ─────────────────────────────────────────────────
// MAX_QUEUE_LAG: queue depth before lag-skip engages (drops to last item).
//   Was 5 — caused content loss after ~1.7s of fast speech at 1.5× speed.
//   Now 12 — only drops if >4s of speech queues unplayed (genuine stall only).
// MAX_AUTO_RATE: ceiling for auto-speed. Raised from 2.5× to 3.0× so the
//   player can genuinely outrun a fast speaker (~3 words/sec) without dropping.
const MAX_QUEUE_LAG  = 12;
const MAX_AUTO_RATE  = 3.0;

const ISLVideoPlayer = ({
  signQueueRef,
  transcript   = "",
  isl          = "",
  isRecording  = false,
  toggleRecording,
  isProcessing = false,
  submitText,
}) => {
  const [currentSign,  setCurrentSign]  = useState(null);
  const [isActive,     setIsActive]     = useState(false);
  const [recentSigns,  setRecentSigns]  = useState([]);
  const [speedMode,    setSpeedMode]    = useState("auto");
  const [activeRate,   setActiveRate]   = useState(1.5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fsInput,      setFsInput]      = useState("");

  const vidARef    = useRef(null);
  const vidBRef    = useRef(null);
  const stageRef   = useRef(null);
  const activeSlot = useRef("A");
  const loopRef    = useRef(false);
  const mountedRef = useRef(true);
  const speedRef   = useRef("auto");

  // ── Two-layer wake system ─────────────────────────────────────────────────
  // Layer 1: promise-based instant wake
  const notifyRef = useRef(null);

  const wakeLoop = useCallback(() => {
    if (notifyRef.current) {
      notifyRef.current();
      notifyRef.current = null;
    }
  }, []);

  // Returns a promise that resolves when wakeLoop() is called OR after
  // a 40 ms safety timeout — whichever comes first.
  const sleepUntilItemOrTimeout = () =>
    new Promise((res) => {
      let resolved = false;
      const safeResolve = () => { if (!resolved) { resolved = true; res(); } };
      notifyRef.current = safeResolve;
      // Layer 2: 40 ms fallback so a missed notify recovers within one frame
      setTimeout(safeResolve, 40);
    });

  // Expose wakeLoop on the ref so the hook can call it
  useEffect(() => {
    signQueueRef.notify = wakeLoop;
    return () => { signQueueRef.notify = null; };
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { speedRef.current = speedMode; }, [speedMode]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFs = () => {
    if (!stageRef.current) return;
    document.fullscreenElement
      ? document.exitFullscreen().catch(() => {})
      : stageRef.current.requestFullscreen().catch(() => {});
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getVid = (s) => s === "A" ? vidARef.current : vidBRef.current;
  const flip   = (s) => s === "A" ? "B" : "A";

  const targetRate = useCallback((qLen) => {
    const m = speedRef.current;
    if (m !== "auto") return Number(m);
    // Smooth ramp: 1.5× at idle → 3.0× at 10+ items in queue
    if (qLen <= 1)  return 1.5;
    if (qLen === 2) return 1.75;
    if (qLen === 3) return 2.0;
    if (qLen === 4) return 2.25;
    if (qLen === 5) return 2.5;
    if (qLen === 6) return 2.6;
    if (qLen === 7) return 2.7;
    if (qLen === 8) return 2.8;
    if (qLen === 9) return 2.9;
    return MAX_AUTO_RATE; // 3.0× for 10+ items
  }, []);

  const preload = useCallback((slot, publicPath, rate) => {
    const v = getVid(slot);
    if (!v) return;
    const src = getCachedSrc(publicPath);
    if (v.dataset.loaded === src) return;
    v.src = src; v.dataset.loaded = src; v.playbackRate = rate; v.load();
  }, []);

  // ── playItem: resolves when clip ends or errors ───────────────────────────
  const playItem = useCallback((item, rate) => {
    return new Promise((resolve) => {
      if (!mountedRef.current) return resolve();

      const publicPath = getVideoSource(item);
      const src        = getCachedSrc(publicPath);
      const slot       = activeSlot.current;
      const vid        = getVid(slot);
      const alt        = getVid(flip(slot));
      if (!vid) return resolve();

      // Swap visibility
      vid.style.display = "block"; vid.style.zIndex = "2";
      if (alt) { alt.style.display = "none"; alt.style.zIndex = "1"; }

      // Update UI immediately
      if (mountedRef.current) {
        setIsActive(true);
        setCurrentSign({ display: item.display || item.text, type: item.type });
        setRecentSigns(p => [...p, item.display || item.text].slice(-16));
        setActiveRate(rate);
      }

      let done = false, started = false;

      const cleanup = () => {
        vid.onloadeddata = null; vid.oncanplay = null;
        vid.onerror = null;
        vid.removeEventListener("ended", onEnded);
        vid.removeEventListener("error", onErr);
      };
      const finish  = () => { if (!done) { done = true; cleanup(); resolve(); } };
      const onEnded = finish;
      const onErr   = finish; // silently skip missing clips

      vid.addEventListener("ended",  onEnded);
      vid.addEventListener("error",  onErr);

      const go = () => {
        if (started || done) return;
        started = true;
        vid.playbackRate = rate;
        const p = vid.play();
        if (p) p.catch(finish);
      };

      // Fast path: already in cache (readyState 4 for blob URLs)
      if (vid.dataset.loaded === src && vid.readyState >= 3) {
        vid.currentTime = 0; go(); return;
      }

      vid.src = src; vid.dataset.loaded = src; vid.load();
      vid.onloadeddata = go;
      vid.oncanplay    = go;
      vid.onerror      = onErr;
      // Hard fallback: skip if no event fires within 500 ms
      setTimeout(() => { if (!started && !done) { vid.readyState >= 3 ? go() : finish(); } }, 500);
    });
  }, []);

  // ── Drain loop — runs forever, never exits while mounted ─────────────────
  //
  // Structure:
  //   while (mounted) {
  //     if queue empty → sleep (with 40 ms safety fallback)
  //     else → lag-skip if behind, dequeue, preload next, play, flip slot
  //   }
  //
  // The double-check after sleep ("continue" immediately re-checks the
  // while condition) closes the race window where notify() fires before
  // notifyRef.current is set.
  //
  const startLoop = useCallback(async () => {
    if (loopRef.current) return;
    loopRef.current = true;

    while (mountedRef.current) {
      const q = signQueueRef.current;

      if (!q || q.length === 0) {
        if (mountedRef.current) setIsActive(false);
        // Sleep — the 40 ms timeout inside sleepUntilItemOrTimeout()
        // guarantees we re-check within one animation frame even if
        // notify() fired before the resolver was stored.
        await sleepUntilItemOrTimeout();
        // Re-check immediately after waking — if queue is still empty
        // we go back to sleep; if it has items we fall through to play.
        continue;
      }

      if (mountedRef.current) setIsActive(true);

      // Lag-skip: if too far behind, jump to the most recent word so the
      // avatar stays in sync with the speaker right now.
      if (q.length > MAX_QUEUE_LAG) {
        signQueueRef.current = [q[q.length - 1]];
      }

      const item = signQueueRef.current.shift();
      const rate = targetRate(signQueueRef.current.length + 1);

      // Preload next clip into idle slot while current plays
      if (signQueueRef.current.length > 0) {
        preload(
          flip(activeSlot.current),
          getVideoSource(signQueueRef.current[0]),
          targetRate(signQueueRef.current.length)
        );
      }

      await playItem(item, rate);

      activeSlot.current = flip(activeSlot.current);
    }

    loopRef.current = false;
  }, [targetRate, playItem, preload, signQueueRef]);

  // Start the loop once on mount; clean up on unmount
  useEffect(() => {
    startLoop();
    return () => { mountedRef.current = false; wakeLoop(); };
  }, [startLoop, wakeLoop]);

  // ── Fullscreen text input ─────────────────────────────────────────────────
  const handleFsSubmit = (e) => {
    e.preventDefault();
    if (!fsInput.trim() || !submitText) return;
    submitText(fsInput.trim()); setFsInput("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col gap-2">

      {/* ── Ticker + speed bar ──────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-1">

        {/* Running signs ticker */}
        <div className="flex-1 h-9 flex items-center gap-1.5 overflow-x-auto px-2
                        bg-warm-100 dark:bg-dark-card border border-warm-200
                        dark:border-dark-border rounded-xl">
          {recentSigns.length === 0
            ? <span className="text-xs text-slate-400 italic whitespace-nowrap">
                Spoken signs appear here in sequence…
              </span>
            : recentSigns.map((s, i) => {
                const cur = i === recentSigns.length - 1;
                return (
                  <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-semibold
                    flex-shrink-0 transition-all duration-75 ${
                      cur
                        ? "bg-hearing-600 text-white scale-105 shadow-xs"
                        : "bg-warm-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                    }`}>
                    {s}
                  </span>
                );
              })
          }
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-0.5 bg-warm-100 dark:bg-dark-card
                        border border-warm-200 dark:border-dark-border
                        px-1.5 py-1 rounded-xl flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
            Speed:
          </span>
          {[
            { id: "auto", label: "⚡ Auto" },
            { id: 1.0,   label: "1×"      },
            { id: 1.5,   label: "1.5×"    },
            { id: 2.0,   label: "2×"      },
          ].map(m => (
            <button key={m.id} onClick={() => setSpeedMode(m.id)}
              className={`px-2 py-0.5 text-xs font-semibold rounded-lg transition-all ${
                speedMode === m.id
                  ? "bg-hearing-600 text-white font-bold shadow-xs"
                  : "text-slate-600 dark:text-slate-300 hover:bg-warm-200 dark:hover:bg-slate-700"
              }`}>
              {m.label}
            </button>
          ))}
          <button onClick={toggleFs} title="Fullscreen"
            className="ml-1 p-1 rounded-lg text-slate-500 hover:text-slate-800
                       dark:text-slate-400 dark:hover:text-white
                       hover:bg-warm-200 dark:hover:bg-slate-700 cursor-pointer">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isFullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"/>
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/>
              }
            </svg>
          </button>
        </div>
      </div>

      {/* ── Video stage ─────────────────────────────────────────────────── */}
      <div ref={stageRef}
           className={`flex-1 relative bg-slate-950 overflow-hidden flex items-center
                       justify-center min-h-[360px] sm:min-h-[420px] xl:min-h-0
                       border border-warm-200/20 dark:border-dark-border
                       ${isFullscreen ? "rounded-none" : "rounded-2xl"}`}>

        {/* Idle placeholder */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center
                          pointer-events-none text-center px-4 z-10 select-none">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-3 shadow-inner">
              <Hand size={28} />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Signs play in real-time as you speak
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click the microphone button above to start
            </p>
          </div>
        )}

        {/* Video A */}
        <video ref={vidARef}
               className="absolute inset-0 w-full h-full object-contain"
               style={{ display: "none", zIndex: 2 }}
               muted playsInline preload="auto" />

        {/* Video B */}
        <video ref={vidBRef}
               className="absolute inset-0 w-full h-full object-contain"
               style={{ display: "none", zIndex: 1 }}
               muted playsInline preload="auto" />

        {/* ── Fullscreen HUD ─────────────────────────────────────────────── */}
        {isFullscreen && (
          <>
            <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg drop-shadow">SoundSigns</span>
                {isActive && (
                  <span className="flex items-center gap-1.5 bg-green-600/90 text-white
                                   text-xs font-bold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE
                  </span>
                )}
              </div>
              {toggleRecording && (
                <button onClick={toggleRecording}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold flex items-center
                              gap-2 transition-all ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  </svg>
                  {isRecording ? "Stop" : "Speak"}
                </button>
              )}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 bg-black/60 px-2 py-1 rounded-full">
                  {speedMode === "auto" ? `⚡ ${activeRate.toFixed(1)}×` : `${activeRate.toFixed(1)}×`}
                </span>
                <button onClick={toggleFs}
                  className="p-1.5 bg-black/50 rounded-full text-white hover:bg-black/80">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 right-4 z-40 flex flex-col items-center gap-2">
              <div className="w-full max-w-3xl bg-black/80 backdrop-blur rounded-2xl
                              border border-white/10 px-5 py-3 text-center">
                {currentSign && (
                  <div className="inline-flex items-center gap-2 px-3 py-0.5 mb-1.5
                                  rounded-full bg-emerald-500/20 border border-emerald-500/40
                                  text-emerald-300 text-xs font-bold">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-widest">NOW:</span>
                    <span className="font-mono text-white text-sm">{currentSign.display}</span>
                  </div>
                )}
                <div className="text-white text-lg font-semibold min-h-[1.75rem]">
                  {transcript
                    ? `"${transcript}"`
                    : <span className="text-slate-400 text-sm italic">
                        {isRecording ? "Listening…" : "Press Speak to start"}
                      </span>
                  }
                </div>
                {isl && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/10 text-xs font-mono text-cyan-300">
                    <span className="text-slate-400 font-sans uppercase tracking-wider mr-1">ISL:</span>
                    {isl}
                  </div>
                )}
              </div>
              {submitText && (
                <form onSubmit={handleFsSubmit}
                      className="w-full max-w-xl flex gap-2 bg-black/80 p-1.5 rounded-xl
                                 border border-slate-700">
                  <input value={fsInput} onChange={e => setFsInput(e.target.value)}
                    placeholder="Type to sign…"
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700
                               rounded-lg text-white placeholder-slate-400
                               focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
                  <button type="submit" disabled={!fsInput.trim()}
                    className="px-4 py-1.5 text-sm font-semibold bg-emerald-600
                               hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg">
                    Sign
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {/* ── Standard-mode overlays ──────────────────────────────────────── */}
        {!isFullscreen && isActive && (
          <>
            <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 bg-black/70
                               px-2 py-0.5 rounded-full border border-emerald-600/40">
                {speedMode === "auto"
                  ? `⚡ ${activeRate.toFixed(1)}×`
                  : `${activeRate.toFixed(1)}×`}
              </span>
              <span className="flex items-center gap-1.5 bg-green-600/90 text-white
                               text-xs font-bold px-2.5 py-1 rounded-full shadow">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>LIVE
              </span>
            </div>
            {currentSign && (
              <div className="absolute bottom-0 left-0 right-0 z-30
                              bg-gradient-to-t from-black/90 to-transparent
                              px-4 py-3 flex items-end justify-between">
                <span className={`text-white font-bold tracking-wide ${
                  currentSign.type === "letter" ? "font-mono text-2xl" : "text-lg"
                }`}>
                  {currentSign.display}
                </span>
                <span className="text-gray-400 text-xs uppercase tracking-widest">
                  {currentSign.type}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ISLVideoPlayer;
