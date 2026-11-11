import React, { useState } from "react";
import ISLVideoSection from "./ISLVideoSection";
import GestureTerminal from "./GestureTerminal";
import ClinicalHeroIllustration from "./ClinicalHeroIllustration";
import ClinicalTriagePanel from "./ClinicalTriagePanel";
import { speakText } from "./ttsUtils";
import {
  Mic,
  Hand,
  Volume2,
  Play,
  RotateCcw,
  MessageSquare,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Columns,
  Maximize2,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function TwoWayIntercom({
  signQueueRef,
  transcript,
  isl,
  isRecording,
  toggleRecording,
  isProcessing,
  playWord,
  playText,
  submitText,
  conversationHistory = [],
  onAddMessage,
}) {
  const [activeRole, setActiveRole] = useState("split"); // "hearing" | "gesture" | "split"
  const [showWelcomeHero, setShowWelcomeHero] = useState(true);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);

  // Play subtle clinical chime tone
  const playClinicalAlertTone = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880.0, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.45);
    } catch {
      // AudioContext uninitialized
    }
  };

  const handleTriagePhrase = (item) => {
    playClinicalAlertTone();
    if (onAddMessage) {
      onAddMessage({
        sender: "gesture",
        text: item.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isClinical: true,
        label: item.label,
      });
    }
  };

  const hearingCount = conversationHistory.filter((m) => m.sender === "hearing").length;
  const gestureCount = conversationHistory.filter((m) => m.sender === "gesture").length;

  return (
    <div className="w-full h-full flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5 font-inter select-none">
      
      {/* ── 1. Dual-Role Emergency Quick-Start Header ── */}
      <section className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/90 dark:border-dark-border p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-100 dark:border-dark-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope size={14} className="text-teal-600" />
                Hospital Emergency & Triage Encounter
              </span>
              <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-semibold px-2 py-0.5 rounded-full border border-teal-200/70">
                Active Protocol
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-muted mt-0.5">
              Select your role below to optimize the interface for immediate mutual communication
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setShowWelcomeHero((prev) => !prev)}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-dark-border hover:bg-slate-50 transition-colors"
            >
              <Info size={13} />
              <span>{showWelcomeHero ? "Hide Overview" : "Show Overview"}</span>
            </button>
          </div>
        </div>

        {/* Role Switcher Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Clinician Card */}
          <button
            type="button"
            onClick={() => setActiveRole("hearing")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              activeRole === "hearing"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-sm ring-2 ring-teal-500 ring-offset-1"
                : "bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-100"
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              activeRole === "hearing" ? "bg-teal-600 text-white" : "bg-white text-teal-700 shadow-xs border border-slate-200"
            }`}>
              <Mic size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                <span>I am Speaking (Clinician)</span>
                {activeRole === "hearing" && <CheckCircle2 size={13} className="text-teal-400" />}
              </div>
              <p className={`text-[11px] mt-0.5 leading-snug truncate ${
                activeRole === "hearing" ? "text-slate-300 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"
              }`}>
                Speech translates to sign video demonstration for patient
              </p>
            </div>
          </button>

          {/* Deaf Patient Card */}
          <button
            type="button"
            onClick={() => setActiveRole("gesture")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              activeRole === "gesture"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-sm ring-2 ring-teal-500 ring-offset-1"
                : "bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-100"
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              activeRole === "gesture" ? "bg-teal-600 text-white" : "bg-white text-teal-700 shadow-xs border border-slate-200"
            }`}>
              <Hand size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                <span>I am Signing (Deaf Patient)</span>
                {activeRole === "gesture" && <CheckCircle2 size={13} className="text-teal-400" />}
              </div>
              <p className={`text-[11px] mt-0.5 leading-snug truncate ${
                activeRole === "gesture" ? "text-slate-300 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"
              }`}>
                Optical sign recognition and 1-touch triage speak aloud
              </p>
            </div>
          </button>

          {/* Dual Split Bridge */}
          <button
            type="button"
            onClick={() => setActiveRole("split")}
            className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
              activeRole === "split"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 shadow-sm ring-2 ring-teal-500 ring-offset-1"
                : "bg-slate-50 dark:bg-dark-card hover:bg-slate-100 dark:hover:bg-slate-800/80 border-slate-200 dark:border-dark-border text-slate-800 dark:text-slate-100"
            }`}
          >
            <div className={`p-2 rounded-xl flex-shrink-0 ${
              activeRole === "split" ? "bg-teal-600 text-white" : "bg-white text-teal-700 shadow-xs border border-slate-200"
            }`}>
              <Columns size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold tracking-tight flex items-center gap-1.5">
                <span>Face-to-Face Dual Bridge</span>
                {activeRole === "split" && <CheckCircle2 size={13} className="text-teal-400" />}
              </div>
              <p className={`text-[11px] mt-0.5 leading-snug truncate ${
                activeRole === "split" ? "text-slate-300 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"
              }`}>
                Both speech and signing camera displayed side-by-side
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* ── 2. Clinical Welcome Hero Illustration (Collapsible) ── */}
      {showWelcomeHero && (
        <section className="bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/90 dark:border-dark-border p-4 shadow-xs">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="w-full md:w-1/2">
              <ClinicalHeroIllustration className="w-full h-auto max-h-48" />
            </div>
            <div className="w-full md:w-1/2 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                <Sparkles size={13} />
                <span>Zero-Barrier Clinical Care</span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Immediate mutual understanding in high-stress medical moments.
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                SoundSigns connects hearing medical personnel and Deaf patients. Clinicians can speak naturally to produce synchronized sign video, while patients can express symptoms instantly through hand gestures or one-touch visual triage cards.
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-teal-600" />
                  <span>151 Verified Sign Videos</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-teal-600" />
                  <span>21-Landmark Optical Tracking</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. 1-Touch Emergency Triage & Pain Severity Scale ── */}
      <ClinicalTriagePanel onTriggerPhrase={handleTriagePhrase} />

      {/* ── 4. Main Dual / Focused Communication Stage ── */}
      <div
        className={`flex-1 min-h-[420px] ${
          activeRole === "split" ? "flex flex-col xl:flex-row gap-3" : "flex flex-col"
        }`}
      >
        {/* Clinician Speech to Sign Stage */}
        {(activeRole === "hearing" || activeRole === "split") && (
          <div className="flex-1 min-h-[360px] flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/90 dark:border-dark-border p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-dark-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Mic size={14} />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                  Clinician Speech & Sign Translation Stage
                </span>
              </div>
              {activeRole === "split" && (
                <button
                  onClick={() => setActiveRole("hearing")}
                  className="text-[11px] text-teal-700 hover:text-teal-900 dark:text-teal-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 size={12} />
                  <span>Expand</span>
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0">
              <ISLVideoSection
                signQueueRef={signQueueRef}
                onSelectWord={playWord}
                transcript={transcript}
                isl={isl}
                isRecording={isRecording}
                toggleRecording={toggleRecording}
                isProcessing={isProcessing}
                submitText={submitText}
              />
            </div>
          </div>
        )}

        {/* Deaf Patient Sign Camera Stage */}
        {(activeRole === "gesture" || activeRole === "split") && (
          <div className="flex-1 min-h-[360px] flex flex-col bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/90 dark:border-dark-border p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100 dark:border-dark-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Hand size={14} />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">
                  Patient Sign Camera & Speech Vocalizer
                </span>
              </div>
              {activeRole === "split" && (
                <button
                  onClick={() => setActiveRole("gesture")}
                  className="text-[11px] text-teal-700 hover:text-teal-900 dark:text-teal-400 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 size={12} />
                  <span>Expand</span>
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0">
              <GestureTerminal
                onSendMessage={onAddMessage}
                isFullFocus={activeRole === "gesture"}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 5. Clean Conversation Dialogue Timeline ── */}
      <section
        className={`bg-white dark:bg-dark-surface rounded-2xl border border-slate-200/90 dark:border-dark-border shadow-xs p-3.5 sm:p-4 flex flex-col transition-all duration-300 ${
          isTimelineExpanded ? "h-64 sm:h-72" : "h-12"
        }`}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <MessageSquare size={14} />
            </div>
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Encounter Dialogue Log
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border px-2 py-0.5 rounded-full text-slate-600 dark:text-slate-300 font-medium">
              {conversationHistory.length} exchanges
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTimelineExpanded((prev) => !prev)}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white font-semibold flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {isTimelineExpanded ? (
                <>
                  <ChevronDown size={14} />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <ChevronUp size={14} />
                  <span>Show History</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isTimelineExpanded && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
            {conversationHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 italic gap-1">
                <span>No conversation logged yet.</span>
                <span className="text-[11px] not-italic text-slate-400">Speak into the microphone, sign into the camera, or tap a triage symptom above.</span>
              </div>
            ) : (
              conversationHistory.map((msg, index) => {
                const isHearing = msg.sender === "hearing";
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-2.5 ${
                      isHearing ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isHearing && (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Mic size={14} />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs border ${
                        isHearing
                          ? "bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-100"
                          : "bg-teal-50/70 border-teal-200 text-slate-900 dark:bg-teal-950/30 dark:border-teal-800 dark:text-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] text-slate-500 mb-1 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span>{isHearing ? "Clinician (Speech)" : "Patient (Sign / Triage)"}</span>
                          {msg.isClinical && (
                            <span className="bg-rose-100 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                              Clinical Triage
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-slate-400">{msg.timestamp}</span>
                      </div>

                      <p className="text-xs sm:text-sm font-medium leading-relaxed">{msg.text}</p>

                      <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center gap-3">
                        {isHearing ? (
                          <button
                            onClick={() => playText && playText(msg.text)}
                            className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Play size={12} />
                            <span>Replay Sign Video</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => speakText(msg.text, "gentle")}
                            className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Volume2 size={12} />
                            <span>Hear Voice</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!isHearing && (
                      <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                        <Hand size={14} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
}
