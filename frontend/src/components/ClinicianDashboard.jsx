import React, { useState } from "react";
import ISLVideoPlayer from "./ISLVideoPlayer";
import {
  Mic,
  MicOff,
  Volume2,
  Stethoscope,
  ArrowLeft,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Zap,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { speakText } from "./ttsUtils";

export default function ClinicianDashboard({
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
  onSwitchRole,
}) {
  const [activePlaybackSpeed, setActivePlaybackSpeed] = useState(1.0);

  const CLINICAL_PROMPTS = [
    { label: "Where does it hurt?", text: "Where does it hurt?" },
    { label: "Rate pain 1-10", text: "How severe is your pain from 1 to 10?" },
    { label: "Any allergies?", text: "Do you have any drug or food allergies?" },
    { label: "Breathe deeply", text: "Please stay still and breathe deeply" },
    { label: "Take medication", text: "Please take this medication with water" },
    { label: "Help is on the way", text: "You are safe and the doctor is examining you" },
  ];

  const handleTriggerPrompt = (text) => {
    if (submitText) {
      submitText(text);
    }
  };

  const patientMessages = conversationHistory.filter((m) => m.sender === "gesture");

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FAF9F6] dark:bg-dark-bg text-slate-900 dark:text-dark-text overflow-hidden select-none font-inter">
      {/* ── Top Clinician Header Bar ── */}
      <header className="flex-shrink-0 bg-white dark:bg-dark-surface border-b border-stone-200 dark:border-dark-border px-4 py-3 flex items-center justify-between shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSwitchRole}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-dark-card text-xs font-semibold cursor-pointer transition-colors"
            title="Return to role selection"
          >
            <ArrowLeft size={14} />
            <span>Switch Role</span>
          </button>

          <div className="h-4 w-px bg-stone-200 dark:bg-dark-border hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-juniper-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Clinician Speech Console
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-juniper-50 dark:bg-teal-950 text-juniper-700 dark:text-teal-300 font-bold border border-juniper-200/60 dark:border-teal-800">
                  Voice-to-Sign Active
                </span>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 hidden sm:block">
                Speak into the microphone — signs display for the patient in real time
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-dark-card border border-stone-200 dark:border-dark-border text-xs text-stone-600 dark:text-stone-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px]">151 Sign Lexicon Ready</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Main Two-Column Stage ── */}
      <main className="flex-1 min-h-0 p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Left Column: Clinician Speech & Action Zone */}
        <section className="w-full lg:w-[45%] flex flex-col gap-3 min-h-0 overflow-y-auto pr-0.5">
          {/* 1. Large Push-To-Talk Card */}
          <div className="bg-white dark:bg-dark-surface rounded-3xl border border-stone-200 dark:border-dark-border p-5 sm:p-6 shadow-xs flex flex-col items-center text-center">
            <button
              type="button"
              onClick={toggleRecording}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-elevated ${
                isRecording
                  ? "bg-rose-600 text-white ring-8 ring-rose-100 dark:ring-rose-950/60 animate-pulse scale-105"
                  : "bg-juniper-600 hover:bg-juniper-700 text-white ring-8 ring-stone-100 dark:ring-stone-800"
              }`}
              title={isRecording ? "Click to stop listening" : "Click to speak"}
            >
              {isRecording ? <MicOff size={36} /> : <Mic size={36} />}
            </button>

            <div className="mt-4">
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {isRecording ? "Listening to your voice…" : "Click Microphone to Speak"}
              </span>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {isRecording ? "Speak clearly at normal bedside pace" : "Instant translation into patient's sign language"}
              </p>
            </div>

            {/* Live Spoken Words Transcript */}
            <div className="w-full mt-4 p-4 rounded-2xl bg-stone-50 dark:bg-dark-card border border-stone-200/80 dark:border-dark-border text-left min-h-[72px] flex flex-col justify-center">
              <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400 mb-1">
                <span>Live Speech Transcript</span>
                {isRecording && (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                    Recording
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-white leading-relaxed">
                {transcript || (
                  <span className="text-stone-400 italic">Spoken words will appear here…</span>
                )}
              </p>
            </div>

            {/* Translated Sign Gloss Tags */}
            {isl && (
              <div className="w-full mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-semibold text-stone-500">Sign Sequence:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-mono text-xs font-bold">
                  {isl}
                </span>
              </div>
            )}
          </div>

          {/* 2. Rapid Clinical Prompts Dock */}
          <div className="bg-white dark:bg-dark-surface rounded-3xl border border-stone-200 dark:border-dark-border p-4 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-juniper-600" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1-Tap Clinical Prompts
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CLINICAL_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTriggerPrompt(prompt.text)}
                  className="p-2.5 rounded-xl border border-stone-200 dark:border-dark-border bg-stone-50 dark:bg-dark-card hover:bg-stone-100 dark:hover:bg-slate-800 text-left text-xs font-semibold text-slate-800 dark:text-stone-200 transition-colors cursor-pointer active:scale-98"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Patient Voice Responses Stream */}
          <div className="bg-white dark:bg-dark-surface rounded-3xl border border-stone-200 dark:border-dark-border p-4 shadow-xs flex-1 min-h-[140px] flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-dark-border">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Patient Responses (Audio Spoken)
                </h3>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                {patientMessages.length} responses
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {patientMessages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-stone-400 italic">
                  Patient signs or tapped symptom choices will appear and speak aloud here…
                </div>
              ) : (
                patientMessages.map((msg, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-slate-900 dark:text-white shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-sky-800 dark:text-sky-300 text-[10px] mb-1">
                      <span>Deaf Patient</span>
                      <span className="font-mono text-stone-400">{msg.timestamp}</span>
                    </div>
                    <p className="font-medium text-xs sm:text-sm leading-snug">{msg.text}</p>
                    <div className="mt-2 pt-1 border-t border-sky-200/50 dark:border-sky-800/50 flex items-center justify-end">
                      <button
                        onClick={() => speakText(msg.text, "gentle")}
                        className="text-[11px] text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <Volume2 size={12} />
                        <span>Replay Audio</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Patient Sign-Video Demonstration Stage */}
        <section className="w-full lg:w-[55%] flex flex-col bg-white dark:bg-dark-surface rounded-3xl border border-stone-200 dark:border-dark-border p-4 shadow-xs min-h-[380px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-100 dark:border-dark-border flex-shrink-0">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span>Sign Language Video Demonstration</span>
                <span className="text-[10px] bg-juniper-50 dark:bg-teal-950 text-juniper-700 dark:text-teal-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                  Zero Latency
                </span>
              </span>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Face this screen towards your patient so they can clearly read the sign demonstration
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <ISLVideoPlayer signQueueRef={signQueueRef} />
          </div>
        </section>
      </main>
    </div>
  );
}

