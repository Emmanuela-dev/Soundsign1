import { useState, useRef, useCallback, useEffect } from "react";
import { resolveSpokenWordToSignItems, convertTextToISLGlossLocally } from "../components/videoUtils.js";

const API_BASE_URL = import.meta.env.PROD
  ? "https://soundsigns.onrender.com"
  : "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// useSpeechRecognition — real-time word-by-word sign translation
//
// Key design decisions
// ────────────────────
// 1. CONFIRMED vs INTERIM are tracked separately.
//    • Confirmed words (isFinal) are pushed to the sign queue ONCE and
//      immediately — they never get re-processed.
//    • Interim words are pushed speculatively. On the next event the
//      previous interim set is REPLACED entirely (not diffed), so a
//      browser correction that shortens the interim string never causes
//      a stale-word or negative-diff problem.
//
// 2. signQueueRef is a plain array ref — pushing to it never triggers a
//    React re-render or timing boundary. signQueueRef.notify() is called
//    every time items are pushed, waking the drain loop immediately.
//
// 3. The backend call (ISL gloss text panel) is fire-and-forget. It never
//    blocks or affects the sign queue.
// ─────────────────────────────────────────────────────────────────────────────

export const useSpeechRecognition = () => {
  const [transcript,      setTranscript]      = useState("");
  const [isl,             setIsl]             = useState("");
  const [isRecording,     setIsRecording]     = useState(false);
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [translationError,setTranslationError]= useState("");

  const recognitionRef     = useRef(null);
  const isRecordingRef     = useRef(false);
  const inFlightRef        = useRef(0);
  const lastBackendTextRef = useRef("");
  // AbortController for the current in-flight /translate request.
  // Cancelled and replaced each time a new request fires so stale responses
  // from earlier utterances never overwrite a fresher gloss result.
  const translateAbortRef  = useRef(null);

  // ── signQueueRef — shared with ISLVideoPlayer ─────────────────────────────
  const signQueueRef = useRef([]);

  // ── Confirmed word count — how many words have already been pushed as final
  // Indexed by token position so we never re-push the same confirmed word.
  const confirmedPushedCountRef = useRef(0);

  // ── Last interim word list pushed speculatively (so we can replace it) ────
  const lastInterimItemsRef = useRef([]); // { items, wordCount }

  // Keep isRecordingRef in sync
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Tokenise a string into clean lowercase word tokens */
  const tokenise = (text) =>
    text.replace(/[.,!?;"']/g, "").trim().split(/\s+/).filter(Boolean);

  /**
   * Resolve a token array into sign items, handling 2-word compounds.
   * Returns { items: SignItem[], wordCount: number }
   */
  const resolveTokens = (tokens) => {
    const items = [];
    let i = 0;
    while (i < tokens.length) {
      // Try 2-word compound first (e.g. "thank you", "do not")
      if (i + 1 < tokens.length) {
        const phrase = `${tokens[i]} ${tokens[i + 1]}`.toLowerCase();
        const phraseItems = resolveSpokenWordToSignItems(phrase);
        if (phraseItems.length === 1 && phraseItems[0].type === "word") {
          items.push(...phraseItems);
          i += 2;
          continue;
        }
      }
      items.push(...resolveSpokenWordToSignItems(tokens[i]));
      i++;
    }
    return { items, wordCount: tokens.length };
  };

  /** Push items to the sign queue and wake the drain loop */
  const pushItems = useCallback((items) => {
    if (!items.length) return;
    for (const item of items) signQueueRef.current.push(item);
    if (signQueueRef.notify) signQueueRef.notify();
  }, []);

  // ── Backend translation (fire-and-forget, text panel only) ────────────────
  const translateInBackground = useCallback(async (text) => {
    const clean = text.trim();
    if (!clean || clean === lastBackendTextRef.current) return;
    lastBackendTextRef.current = clean;

    // Cancel any in-flight request for an older utterance.
    // This prevents a slow response from overwriting a newer one.
    if (translateAbortRef.current) {
      translateAbortRef.current.abort();
    }
    const controller = new AbortController();
    translateAbortRef.current = controller;

    inFlightRef.current++;
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("Backend:", res.status, err);
        if (res.status === 429)     setTranslationError("⚠️ API rate limit — please wait a moment.");
        else if (res.status >= 500) setTranslationError("⚠️ Backend error — check GEMINI_API_KEY.");
        return;
      }
      const data = await res.json();
      const gloss = (data.isl || "").replace(/"/g, "").trim();
      if (gloss && gloss.toLowerCase() !== "translation error") {
        setTranslationError("");
        setIsl(gloss);
      }
    } catch (err) {
      // AbortError is expected when a newer request cancels this one — not an error.
      if (err.name === "AbortError") return;
      // Context-aware message: production uses Render, dev uses localhost.
      const backendLabel = import.meta.env.PROD
        ? "the cloud backend (may be warming up — try again in a moment)"
        : "the backend on port 5000 — is it running?";
      setTranslationError(`⚠️ Cannot reach ${backendLabel}`);
    } finally {
      inFlightRef.current--;
      if (inFlightRef.current === 0) setIsProcessing(false);
    }
  }, []);

  // ── startRecording ────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported. Use Chrome or Edge.");
      return;
    }

    // Full reset
    setTranscript("");
    setIsl("");
    setTranslationError("");
    signQueueRef.current          = [];
    confirmedPushedCountRef.current = 0;
    lastInterimItemsRef.current   = [];
    inFlightRef.current           = 0;
    lastBackendTextRef.current    = "";

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang           = "en-US";
    rec.continuous     = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    // Session-scoped state (not refs — lives inside the closure)
    let confirmedText   = "";     // all final words joined
    let confirmedTokens = [];     // tokenised confirmed words

    rec.onstart = () => { isRecordingRef.current = true; setIsRecording(true); };

    rec.onerror = (e) => {
      if (e.error === "no-speech") return;
      console.error("Speech recognition error:", e.error);
      isRecordingRef.current = false;
      setIsRecording(false);
      setIsProcessing(false);
    };

    rec.onresult = (event) => {
      let newFinalText = "";
      let interimText  = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          newFinalText += (newFinalText ? " " : "") + t.trim();
        } else {
          interimText += t;
        }
      }

      // ── 1. Process new CONFIRMED (final) words ────────────────────────────
      if (newFinalText.trim()) {
        // Append to session-level confirmed text
        confirmedText += (confirmedText ? " " : "") + newFinalText.trim();

        // Retokenise and push only the NEW confirmed tokens
        const allConfirmedTokens = tokenise(confirmedText);
        const newTokens = allConfirmedTokens.slice(confirmedTokens.length);
        confirmedTokens = allConfirmedTokens;

        if (newTokens.length) {
          // Remove any speculative interim items we already queued for these
          // words — they're now being replaced by confirmed versions
          const interimCount = lastInterimItemsRef.current.wordCount || 0;
          if (interimCount > 0) {
            // Trim the last `interimCount` sign items from the queue that
            // haven't played yet (they were the speculative interim push)
            const q = signQueueRef.current;
            const trimCount = Math.min(lastInterimItemsRef.current.items?.length ?? 0, q.length);
            if (trimCount > 0) {
              signQueueRef.current = q.slice(0, q.length - trimCount);
            }
            lastInterimItemsRef.current = [];
          }

          const { items } = resolveTokens(newTokens);
          confirmedPushedCountRef.current += newTokens.length;
          pushItems(items);
        }

        // Fire backend for the text-panel gloss
        translateInBackground(newFinalText.trim());
      }

      // ── 2. Process INTERIM words speculatively ────────────────────────────
      if (interimText.trim()) {
        const interimTokens = tokenise(interimText);
        if (interimTokens.length) {
          // REPLACE previous interim items — never accumulate stale speculations
          // First remove old interim items from the tail of the queue
          const oldInterim = lastInterimItemsRef.current;
          if (oldInterim.items?.length) {
            const q = signQueueRef.current;
            const trimCount = Math.min(oldInterim.items.length, q.length);
            if (trimCount > 0) {
              signQueueRef.current = q.slice(0, q.length - trimCount);
            }
          }

          const resolved = resolveTokens(interimTokens);
          lastInterimItemsRef.current = resolved;
          pushItems(resolved.items);
        }
      } else {
        // No interim — clear speculative state
        lastInterimItemsRef.current = [];
      }

      // ── 3. Update transcript display ──────────────────────────────────────
      const fullText = (confirmedText + (interimText ? " " + interimText : "")).trim();
      setTranscript(fullText);

      // Local gloss for text panel (instant, no network)
      const localGloss = convertTextToISLGlossLocally(fullText);
      if (localGloss) setIsl(localGloss);
    };

    // Auto-restart on unexpected stop (Chrome long-silence behaviour)
    rec.onend = () => {
      if (recognitionRef.current && isRecordingRef.current) {
        try { rec.start(); } catch { /* already started */ }
      }
    };

    rec.start();
  }, [pushItems, translateInBackground]);

  // ── stopRecording ─────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    // Cancel any pending translation request — no point receiving a gloss
    // for speech that has already ended.
    if (translateAbortRef.current) {
      translateAbortRef.current.abort();
      translateAbortRef.current = null;
    }
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) try { rec.stop(); } catch { /* ignore */ }
  }, []);

  // ── playWord / playText / submitText (used by other UI components) ─────────
  const playText = useCallback((text) => {
    if (!text?.trim()) return;
    const { items } = resolveTokens(tokenise(text));
    pushItems(items);
  }, [pushItems]);

  const playWord = useCallback((word) => {
    if (!word) return;
    pushItems(resolveSpokenWordToSignItems(word));
  }, [pushItems]);

  const submitText = useCallback((text) => {
    const clean = text?.trim();
    if (!clean) return;
    setTranscript(clean);
    setIsl(convertTextToISLGlossLocally(clean));
    playText(clean);
    translateInBackground(clean);
  }, [playText, translateInBackground]);

  const toggleRecording = useCallback(() => {
    isRecording ? stopRecording() : startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return {
    transcript, isl, isRecording, isProcessing, translationError,
    signQueueRef,
    toggleRecording, startRecording, stopRecording,
    playWord, playText, submitText,
  };
};
