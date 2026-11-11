import { useState, useEffect } from "react";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";
import { useVideoPreloader } from "./hooks/useVideoPreloader.js";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import Header from "./components/Header.jsx";
import BackgroundElements from "./components/BackgroundElements.jsx";
import LiveTranscriptSection from "./components/LiveTranscriptSection.jsx";
import ISLGlossSection from "./components/ISLGlossSection.jsx";
import ISLVideoSection from "./components/ISLVideoSection.jsx";
import TwoWayIntercom from "./components/TwoWayIntercom.jsx";
import Footer from "./components/Footer.jsx";

function AppContent() {
  const [mode, setMode] = useState("translator");
  const [conversationHistory, setConversationHistory] = useState([
    { sender: "hearing", text: "Hello! Welcome to SoundSigns.", timestamp: "12:00 PM" },
    { sender: "gesture", text: "Hello, nice to meet you!",      timestamp: "12:01 PM" },
  ]);

  // ── Pre-load all 151 sign videos into browser memory on mount ─────────────
  // This ensures every clip plays with zero network latency from the first word.
  const { loaded, total, complete } = useVideoPreloader();

  // ── Backend warm-up ping ───────────────────────────────────────────────────
  // The production backend runs on Render's free tier and spins down after
  // 15 minutes of inactivity. Cold starts take 30–60 seconds. Pinging /health
  // on page load wakes the instance before the user first speaks, so the first
  // real /translate request hits a warm server instead of a cold one.
  useEffect(() => {
    const API_BASE_URL = import.meta.env.PROD
      ? "https://soundsigns.onrender.com"
      : "http://localhost:5000";
    fetch(`${API_BASE_URL}/health`).catch(() => {
      // Silently ignore — warm-up failure is non-critical.
      // The user will see the error message from useSpeechRecognition when
      // they actually try to translate.
    });
  }, []); // [] — runs once on mount only

  const {
    transcript,
    isl,
    isRecording,
    isProcessing,
    translationError,
    signQueueRef,
    toggleRecording,
    playWord,
    playText,
    submitText,
  } = useSpeechRecognition();

  const handleAddMessage = (msg) => {
    setConversationHistory((prev) => [...prev, msg]);
  };

  const handleSubmitText = (text) => {
    submitText(text);
    handleAddMessage({
      sender: "hearing",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  return (
    <div className="h-screen overflow-hidden
                    bg-slate-50 dark:bg-[#000000]
                    text-slate-900 dark:text-[#DDE3E7]
                    font-inter transition-colors duration-300 flex flex-col">

      <BackgroundElements />

      {/* ── Video pre-cache progress bar (disappears once complete) ─────── */}
      {!complete && (
        <div className="flex-shrink-0 mx-4 mt-1 z-40">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80
                          border border-slate-200 dark:border-slate-700/50 rounded-lg text-xs
                          text-slate-500 dark:text-slate-400">
            <div className="w-3 h-3 border-2 border-slate-400 border-t-emerald-500
                            rounded-full animate-spin flex-shrink-0" />
            <span>Warming up signs…</span>
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((loaded / total) * 100)}%` }}
              />
            </div>
            <span className="font-mono tabular-nums">{loaded}/{total}</span>
          </div>
        </div>
      )}

      {/* Backend error banner */}
      {translationError && (
        <div className="flex-shrink-0 mx-4 mt-2 px-4 py-2
                        bg-amber-100 dark:bg-amber-900/40
                        border border-amber-300 dark:border-amber-700
                        rounded-lg flex items-center gap-3 text-sm
                        text-amber-800 dark:text-amber-200 shadow z-50">
          <span className="emoji text-base">⚠️</span>
          <span className="font-medium">{translationError}</span>
          <span className="ml-auto text-xs opacity-70">
            (signs still play in real-time — only the gloss text is affected)
          </span>
        </div>
      )}

      {/* Header with mic button and Two-Way Mode Switcher */}
      <div className="flex-shrink-0 mb-2">
        <Header
          isRecording={isRecording}
          toggleRecording={toggleRecording}
          isProcessing={isProcessing}
          mode={mode}
          setMode={setMode}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 relative w-full max-w-[1760px] mx-auto px-2 sm:px-4 lg:px-6 overflow-hidden min-h-0">
        {mode === "twoway" ? (
          /* ── TWO-WAY INTERCOM CONVERSATION BRIDGE ── */
          <TwoWayIntercom
            signQueueRef={signQueueRef}
            transcript={transcript}
            isl={isl}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            isProcessing={isProcessing}
            playWord={playWord}
            playText={playText}
            submitText={handleSubmitText}
            conversationHistory={conversationHistory}
            onAddMessage={handleAddMessage}
          />
        ) : (
          /* ── CLASSIC TRANSLATOR MODE (EXPANDED) ── */
          <div className="h-full w-full flex flex-col xl:grid xl:grid-cols-12 gap-3 sm:gap-4 overflow-y-auto xl:overflow-hidden py-1 sm:py-2">
            {/* Left Column: ISL Video Translation (Expanded to ~60% on xl, ~67% on 2xl) */}
            <div className="min-h-[460px] sm:min-h-[520px] xl:min-h-0 xl:h-full xl:col-span-7 2xl:col-span-8 w-full flex-shrink-0 xl:flex-shrink">
              <ISLVideoSection
                signQueueRef={signQueueRef}
                onSelectWord={playWord}
                transcript={transcript}
                isl={isl}
                isRecording={isRecording}
                toggleRecording={toggleRecording}
                isProcessing={isProcessing}
                submitText={handleSubmitText}
              />
            </div>

            {/* Right Column: Live Transcript & ISL Gloss */}
            <div className="flex flex-col gap-3 sm:gap-4 flex-shrink-0 xl:flex-shrink xl:h-full xl:col-span-5 2xl:col-span-4 min-h-[360px] xl:min-h-0">
              <div className="min-h-[180px] xl:flex-1 xl:min-h-0 w-full">
                <LiveTranscriptSection
                  transcript={transcript}
                  onSendText={handleSubmitText}
                  isRecording={isRecording}
                />
              </div>
              <div className="min-h-[180px] xl:flex-1 xl:min-h-0 w-full">
                <ISLGlossSection
                  isl={isl}
                  onReplay={() => isl && playText(isl)}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="flex-shrink-0 mt-2">
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
