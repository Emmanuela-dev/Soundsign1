import React, { useState } from "react";
import {
  Columns,
  Mic,
  Video,
  Maximize2,
  Volume2,
  Play,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import ISLVideoSection from "./ISLVideoSection";
import GestureTerminal from "./GestureTerminal";
import { speakText } from "./ttsUtils";

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
  const [activeMode, setActiveMode] = useState("split");
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);
  const [selectedPain, setSelectedPain] = useState(null);

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
      // AudioContext not supported or uninitialized
    }
  };

  const handleSelectPainScale = (level) => {
    setSelectedPain(level);
    let severity = "Mild";
    if (level >= 4 && level <= 6) severity = "Moderate";
    if (level >= 7) severity = "Severe";
    const painText = `Patient reports Pain Level: ${level}/10 (${severity})`;

    playClinicalAlertTone();
    if (onAddMessage) {
      onAddMessage({
        sender: "gesture",
        text: painText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isClinical: true,
        painLevel: level,
      });
    }
    speakText(`Patient reports pain level ${level} out of 10, ${severity}`, "gentle");
  };

  const CLINICAL_PRESETS = [
    { label: "📍 Pain Location", text: "Where does it hurt?" },
    { label: "📊 Rate Pain 1-10", text: "How severe is your pain from 1 to 10?" },
    { label: "⚠️ Any Allergies?", text: "Do you have any allergies?" },
    { label: "💊 Take Medicine", text: "Please take this medicine after eating" },
    { label: "🫁 Breathe Slowly", text: "Please stay still and breathe slowly" },
  ];

  // Auto-collapse timeline when entering gesture-only mode to maximise camera space
  const handleSetMode = (mode) => {
    setActiveMode(mode);
    if (mode === "gesture") setIsTimelineExpanded(false);
    else setIsTimelineExpanded(true);
  };

  const hearingCount = conversationHistory.filter((m) => m.sender === "hearing").length;
  const gestureCount = conversationHistory.filter((m) => m.sender === "gesture").length;

  return (
    <div className="w-full h-full flex flex-col gap-2.5 sm:gap-3 min-h-0 overflow-hidden font-inter">
      {/* ── Top Mode Selector Bar (Hearing Mode / Gesture Mode / Split View) ── */}
      <div className="flex-shrink-0 bg-white/80 dark:bg-[#000000] backdrop-blur-md px-3 py-2 rounded-2xl border border-white/40 dark:border-[#004AFF]/30 shadow-md flex items-center justify-between gap-2 transition-colors duration-300">
        {/* Mode Selection Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-[#DDE3E7]/70 mr-1 hidden sm:inline">
            Choose Mode:
          </span>

          {/* Split View Button */}
          <button
            onClick={() => handleSetMode("split")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === "split"
                ? "bg-slate-900 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-md shadow-[#004AFF]/20 scale-102"
                : "text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-slate-200 dark:hover:bg-[#004AFF]/15 hover:dark:text-[#DDE3E7]"
            }`}
            title="View both Hearing and Gesture consoles side-by-side"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View (Dual Mode)</span>
          </button>

          {/* Hearing Mode Button */}
          <button
            onClick={() => handleSetMode("hearing")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === "hearing"
                ? "bg-emerald-600 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7] shadow-md dark:shadow-[#004AFF]/30 scale-102 ring-2 ring-emerald-400/50 dark:ring-[#004AFF]/60"
                : "text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-emerald-50 dark:hover:bg-[#004AFF]/15 hover:dark:text-[#DDE3E7]"
            }`}
            title="Focus solely on Hearing Mode: Speech to Sign Avatar"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Hearing Mode</span>
            {hearingCount > 0 && (
              <span className="text-[10px] bg-black/20 dark:bg-white/20 px-1.5 py-0.2 rounded-full">
                {hearingCount}
              </span>
            )}
          </button>

          {/* Gesture Mode Button */}
          <button
            onClick={() => handleSetMode("gesture")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeMode === "gesture"
                ? "bg-blue-600 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7] shadow-md dark:shadow-[#004AFF]/30 scale-102 ring-2 ring-blue-400/50 dark:ring-[#004AFF]/60"
                : "text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-blue-50 dark:hover:bg-[#004AFF]/15 hover:dark:text-[#DDE3E7]"
            }`}
            title="Focus solely on Gesture Mode: Camera Sign Language Interpreter & Voice Output"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Gesture Mode (Camera & Video)</span>
            {gestureCount > 0 && (
              <span className="text-[10px] bg-black/20 dark:bg-white/20 px-1.5 py-0.2 rounded-full">
                {gestureCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Dual/Single Console Stage ── */}
      {/* Use flex row for split, single flex child for solo modes — avoids grid h-full resolution issues */}
      <div className={`flex-1 min-h-0 overflow-hidden ${
        activeMode === "split" ? "flex flex-row gap-3 sm:gap-4" : "flex flex-col"
      }`}>

        {/* ── Hearing Terminal ── */}
        {(activeMode === "hearing" || activeMode === "split") && (
          <div className={`flex flex-col min-h-0 overflow-hidden ${
            activeMode === "split" ? "flex-1" : "flex-1"
          }`}>
            {/* Header pill */}
            <div className="flex items-center justify-between mb-1.5 px-1 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-emerald-700 dark:text-[#DDE3E7] flex items-center gap-1.5 truncate">
                  <Mic className="w-3.5 h-3.5 text-emerald-600 dark:text-[#004AFF]" />
                  <span className="hidden sm:inline">HEARING MODE (Speech & Text → Sign Avatar)</span>
                  <span className="sm:hidden">HEARING MODE</span>
                </span>
                <span className="text-[10px] bg-emerald-100 dark:bg-[#004AFF]/20 text-emerald-800 dark:text-[#DDE3E7] dark:border dark:border-[#004AFF]/40 px-2 py-0.5 rounded-full font-mono flex-shrink-0 hidden sm:inline">
                  ISL Video Engine
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {activeMode === "split" ? (
                  <button onClick={() => handleSetMode("hearing")}
                    className="text-[11px] text-slate-500 hover:text-emerald-600 dark:text-[#DDE3E7]/70 dark:hover:text-[#004AFF] font-semibold flex items-center gap-1 cursor-pointer">
                    <Maximize2 className="w-3 h-3" />
                    <span>Maximize</span>
                  </button>
                ) : (
                  <button onClick={() => handleSetMode("split")}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-[#DDE3E7]/70 dark:hover:text-[#004AFF] font-semibold flex items-center gap-1 cursor-pointer">
                    <Columns className="w-3 h-3" />
                    <span>Split View</span>
                  </button>
                )}
                {activeMode !== "gesture" && (
                  <button onClick={() => handleSetMode("gesture")}
                    className="text-[11px] text-blue-600 dark:text-[#004AFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer pl-2 border-l border-slate-300 dark:border-[#004AFF]/30">
                    <Video className="w-3 h-3" />
                    <span>Gesture</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
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

        {/* ── Gesture Terminal ── */}
        {(activeMode === "gesture" || activeMode === "split") && (
          <div className={`flex flex-col min-h-0 overflow-hidden ${
            activeMode === "split" ? "flex-1" : "flex-1"
          }`}>
            {/* Header pill */}
            <div className="flex items-center justify-between mb-1.5 px-1 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-blue-700 dark:text-[#DDE3E7] flex items-center gap-1.5 truncate">
                  <Video className="w-3.5 h-3.5 text-blue-600 dark:text-[#004AFF]" />
                  <span className="hidden sm:inline">GESTURE MODE (Camera & Video Sign Interpreter → Spoken Audio)</span>
                  <span className="sm:hidden">GESTURE MODE</span>
                </span>
                <span className="text-[10px] bg-blue-100 dark:bg-[#004AFF]/20 text-blue-800 dark:text-[#DDE3E7] dark:border dark:border-[#004AFF]/40 px-2 py-0.5 rounded-full font-mono flex-shrink-0 hidden sm:inline">
                  Optical AR & Video Ground Truth
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {activeMode === "split" ? (
                  <button onClick={() => handleSetMode("gesture")}
                    className="text-[11px] text-slate-500 hover:text-blue-600 dark:text-[#DDE3E7]/70 dark:hover:text-[#004AFF] font-semibold flex items-center gap-1 cursor-pointer">
                    <Maximize2 className="w-3 h-3" />
                    <span>Maximize</span>
                  </button>
                ) : (
                  <button onClick={() => handleSetMode("split")}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:text-[#DDE3E7]/70 dark:hover:text-[#004AFF] font-semibold flex items-center gap-1 cursor-pointer">
                    <Columns className="w-3 h-3" />
                    <span>Split View</span>
                  </button>
                )}
                {activeMode !== "hearing" && (
                  <button onClick={() => handleSetMode("hearing")}
                    className="text-[11px] text-emerald-600 dark:text-[#004AFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer pl-2 border-l border-slate-300 dark:border-[#004AFF]/30">
                    <Mic className="w-3 h-3" />
                    <span>Hearing</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <GestureTerminal
                onSendMessage={onAddMessage}
                isFullFocus={activeMode === "gesture"}
              />
            </div>
          </div>
        )}

      </div>

      {/* ── MedSoundSigns Clinical Triage & Pain Scale HUD ── */}
      <div className="flex-shrink-0 bg-slate-900/90 dark:bg-[#000000] border border-blue-500/30 dark:border-[#004AFF]/40 rounded-xl px-3 py-2 flex flex-col md:flex-row items-center justify-between gap-2 shadow-sm text-xs">
        {/* Pain Scale (1 to 10) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-300 dark:text-[#DDE3E7] flex items-center gap-1 text-[11px]">
            <span>🩺 Pain Scale:</span>
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
              const isSelected = selectedPain === num;
              let bg = "bg-slate-800 text-slate-300 hover:bg-slate-700";
              if (num <= 3) {
                if (isSelected) bg = "bg-emerald-600 text-white font-bold ring-2 ring-emerald-400";
              } else if (num <= 6) {
                if (isSelected) bg = "bg-amber-600 text-white font-bold ring-2 ring-amber-400";
              } else {
                if (isSelected) bg = "bg-rose-600 text-white font-bold ring-2 ring-rose-400";
              }
              return (
                <button
                  key={num}
                  onClick={() => handleSelectPainScale(num)}
                  className={`w-6 h-6 rounded-md text-[11px] flex items-center justify-center transition-all cursor-pointer ${bg}`}
                  title={`Record pain level ${num}/10`}
                >
                  {num}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            (1-3: Mild · 4-6: Mod · 7-10: Severe)
          </span>
        </div>

        {/* Doctor Quick Triage Prompts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-slate-400 hidden xl:inline">Doctor Prompts:</span>
          {CLINICAL_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => submitText && submitText(p.text)}
              className="text-[10px] px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-500/30 text-blue-200 transition-colors cursor-pointer"
              title={`Ask patient: "${p.text}"`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bottom Half: Shared Real-Time Conversation Timeline ── */}
      <div
        className={`flex-shrink-0 bg-white/75 dark:bg-[#000000] backdrop-blur-md rounded-2xl border border-white/40 dark:border-[#004AFF]/30 shadow-lg p-2.5 sm:p-3 flex flex-col overflow-hidden transition-all duration-300 ${
          isTimelineExpanded ? "h-40 sm:h-48" : "h-11"
        }`}
      >
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-200 dark:border-[#004AFF]/25 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#DDE3E7] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-700 dark:text-[#DDE3E7]" />
              Two-Way Conversation Timeline
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-[#004AFF]/20 dark:border dark:border-[#004AFF]/30 px-2 py-0.5 rounded-full text-slate-500 dark:text-[#DDE3E7] font-mono">
              {conversationHistory.length} msgs
            </span>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="text-emerald-600 dark:text-[#004AFF] font-semibold flex items-center gap-0.5">
                <Mic className="w-2.5 h-2.5" />
                {hearingCount}
              </span>
              <span>·</span>
              <span className="text-blue-600 dark:text-[#DDE3E7] font-semibold flex items-center gap-0.5">
                <Video className="w-2.5 h-2.5" />
                {gestureCount}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 dark:text-[#DDE3E7]/60 hidden md:inline">
              Click <Volume2 className="w-3 h-3 inline mx-0.5 text-slate-500" /> to hear voice or <Play className="w-2.5 h-2.5 inline mx-0.5 text-slate-500" /> to replay sign
            </span>
            <button
              onClick={() => setIsTimelineExpanded((prev) => !prev)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:text-[#DDE3E7]/70 dark:hover:text-[#DDE3E7] font-semibold px-2 py-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#004AFF]/20 cursor-pointer transition-colors flex items-center gap-1"
              title={isTimelineExpanded ? "Minimize timeline" : "Expand timeline"}
            >
              {isTimelineExpanded ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  <span>Hide</span>
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  <span>Show History</span>
                </>
              )}
            </button>
          </div>
        </div>

        {isTimelineExpanded && (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {conversationHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-[#DDE3E7]/60 italic">
                Speak with microphone in Hearing Mode or sign into camera in Gesture Mode to start conversation…
              </div>
            ) : (
              conversationHistory.map((msg, index) => {
                const isHearing = msg.sender === "hearing";
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${
                      isHearing ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isHearing && (
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-[#004AFF]/30 text-emerald-700 dark:text-[#DDE3E7] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] rounded-xl px-3 py-1.5 text-xs shadow-xs ${
                        isHearing
                          ? "bg-emerald-50 dark:bg-[#004AFF]/15 border border-emerald-200 dark:border-[#004AFF]/40 text-emerald-900 dark:text-[#DDE3E7]"
                          : "bg-blue-50 dark:bg-[#000000] border border-blue-200 dark:border-[#004AFF]/50 text-blue-900 dark:text-[#DDE3E7]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-70 mb-0.5 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span>{isHearing ? "Doctor / Clinician (Voice)" : "DHH Patient (Sign)"}</span>
                          {msg.isClinical && (
                            <span className="bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                              🩺 Clinical Triage
                            </span>
                          )}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <p className="text-xs font-medium leading-relaxed">{msg.text}</p>

                      {/* Action buttons */}
                      <div className="mt-1 pt-1 border-t border-black/5 dark:border-white/10 flex items-center gap-2">
                        {isHearing ? (
                          <button
                            onClick={() => playText && playText(msg.text)}
                            className="text-[10px] text-emerald-600 dark:text-[#004AFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5" />
                            <span>Sign Again</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => speakText(msg.text, "soft")}
                            className="text-[10px] text-blue-600 dark:text-[#004AFF] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                            title="Hear in soft human voice"
                          >
                            <Volume2 className="w-2.5 h-2.5" />
                            <span>Hear Voice</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {!isHearing && (
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-[#004AFF]/30 text-blue-700 dark:text-[#DDE3E7] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        <Video className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
