import React, { useState } from "react";
import GestureTerminal from "./GestureTerminal";
import ThemeToggle from "./ThemeToggle";
import TriageWizard from "./TriageWizard";
import {
  Hand,
  ArrowLeft,
  Volume2,
  Check,
  X,
  Zap,
  AlertTriangle,
  Pill,
  HeartPulse,
  Wind,
  Droplet,
  Activity,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { speakText } from "./ttsUtils";

const URGENT_SYMPTOMS = [
  { id: "chest_pain", label: "Chest Pain", phrase: "I am having severe chest pain.", icon: HeartPulse },
  { id: "breathe", label: "Can't Breathe", phrase: "I am having serious trouble breathing.", icon: Wind },
  { id: "dizzy", label: "Dizzy / Faint", phrase: "I feel extremely dizzy and faint.", icon: Activity },
  { id: "bleed", label: "Bleeding", phrase: "I am bleeding and need help.", icon: Droplet },
];

const PAIN_TIERS = [
  { score: 0, label: "No Pain" },
  { score: 2, label: "Mild" },
  { score: 4, label: "Moderate" },
  { score: 6, label: "Severe" },
  { score: 8, label: "Very Severe" },
  { score: 10, label: "Worst Possible" },
];

export default function PatientDashboard({
  onSendMessage,
  conversationHistory = [],
  onSwitchRole,
}) {
  const [activePanel, setActivePanel] = useState(null); // null | "pain" | "urgent"
  const [viewMode, setViewMode] = useState("camera"); // "camera" | "wizard"
  const [lastVocalized, setLastVocalized] = useState("");

  const clinicianMessages = conversationHistory.filter((m) => m.sender === "hearing");
  const latestDoctorMessage = clinicianMessages[clinicianMessages.length - 1];

  const handleTriageComplete = (record) => {
    const summary = `${record.chief_complaint} (Location: ${record.location || "N/A"}, Pain: ${record.severity}/10, Priority: ${record.priority})`;
    setLastVocalized(record.chief_complaint);
    if (onSendMessage) {
      onSendMessage({
        sender: "gesture",
        text: summary,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isClinical: true,
        priority: record.priority,
        record,
        label: `Triage: ${record.priority}`,
      });
    }
  };

  const handleSpeakPhrase = (phrase, label = "Response") => {
    setLastVocalized(phrase);
    speakText(phrase, "gentle");

    if (onSendMessage) {
      onSendMessage({
        sender: "gesture",
        text: phrase,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isClinical: true,
        label,
      });
    }

    // Auto-collapse auxiliary panel after selection for minimal distraction
    setTimeout(() => {
      setActivePanel(null);
    }, 1500);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#FAF9F6] dark:bg-dark-bg text-slate-900 dark:text-dark-text overflow-hidden select-none font-inter">
      {/* ── Top Minimal Apple/Google Chrome ── */}
      <header className="flex-shrink-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-stone-200/80 dark:border-dark-border px-4 py-2.5 flex items-center justify-between z-20">
        <button
          type="button"
          onClick={onSwitchRole}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-stone-200 dark:border-dark-border text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-dark-card text-xs font-semibold cursor-pointer transition-colors"
          title="Return to home screen"
        >
          <ArrowLeft size={14} />
          <span>Change Role</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
            SoundSign<span className="text-teal-600 dark:text-teal-400">1</span>
          </span>
          <span className="text-[10px] text-stone-400 uppercase tracking-widest hidden sm:inline">
            · Patient Mode
          </span>
        </div>

        <ThemeToggle />
      </header>

      {/* ── Main Single-Stage Flow (Zero Cognitive Clutter) ── */}
      <main className="flex-1 min-h-0 max-w-4xl w-full mx-auto p-3 sm:p-4 flex flex-col gap-3 overflow-hidden">
        
        {/* 1. Doctor's Spoken Words Banner & Mode Toggle */}
        <div className="flex-shrink-0 bg-white dark:bg-dark-surface rounded-2xl border border-stone-200 dark:border-dark-border p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400 mb-1">
            <span className="flex items-center gap-1.5 text-stone-500 dark:text-stone-300 font-bold uppercase tracking-wider text-[10px]">
              <MessageSquare size={12} className="text-teal-600" />
              <span>Doctor is saying:</span>
            </span>
            <div className="flex items-center gap-2">
              {latestDoctorMessage && (
                <span className="font-mono text-[10px] hidden sm:inline">{latestDoctorMessage.timestamp}</span>
              )}
              {/* Mode Toggle Switch */}
              <div className="flex items-center bg-stone-100 dark:bg-dark-card p-0.5 rounded-lg border border-stone-200/80 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setViewMode("camera")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "camera"
                      ? "bg-white dark:bg-dark-surface text-teal-700 dark:text-teal-400 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  <Hand size={12} />
                  <span>Signing</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("wizard")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "wizard"
                      ? "bg-white dark:bg-dark-surface text-teal-700 dark:text-teal-400 shadow-2xs"
                      : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  }`}
                >
                  <Zap size={12} />
                  <span>Triage Intake</span>
                </button>
              </div>
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
            {latestDoctorMessage ? (
              `"${latestDoctorMessage.text}"`
            ) : (
              <span className="text-stone-400 font-normal italic">
                When the doctor speaks, their words will appear here in large text…
              </span>
            )}
          </p>
        </div>

        {/* 2. Main Viewport: Either Guided Triage Wizard or Camera Viewport */}
        {viewMode === "wizard" ? (
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <TriageWizard onTriageComplete={handleTriageComplete} />
          </div>
        ) : (
          <div className="flex-1 min-h-0 relative rounded-3xl overflow-hidden bg-slate-950 border border-stone-200/40 dark:border-stone-800 shadow-card">
            <GestureTerminal
              onSendMessage={onSendMessage}
              isFullFocus={true}
              minimalMode={true}
            />

            {/* Floating Vocalization Feedback Confirmation */}
            {lastVocalized && (
              <div className="absolute top-4 inset-x-0 flex items-center justify-center pointer-events-none z-30 px-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-md border border-white/20 text-white shadow-2xl text-xs sm:text-sm font-semibold animate-fade-in">
                  <Volume2 size={16} className="text-teal-400 flex-shrink-0" />
                  <span className="truncate">Spoken to doctor: "{lastVocalized}"</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Auxiliary Drawer: Pain Scale (Expanded only when tapped) */}
        {activePanel === "pain" && (
          <div className="flex-shrink-0 bg-white dark:bg-dark-surface rounded-2xl border border-stone-200 dark:border-dark-border p-3.5 shadow-card animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white mb-2 pb-1 border-b border-stone-100 dark:border-dark-border">
              <span>Tap your pain severity (0 to 10):</span>
              <button
                onClick={() => setActivePanel(null)}
                className="text-stone-400 hover:text-stone-600 text-xs px-2 py-0.5 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PAIN_TIERS.map((tier) => (
                <button
                  key={tier.score}
                  type="button"
                  onClick={() =>
                    handleSpeakPhrase(
                      `Patient reports pain level ${tier.score} out of 10: ${tier.label}.`,
                      `Pain ${tier.score}/10`
                    )
                  }
                  className="py-2.5 px-2 rounded-xl bg-stone-50 dark:bg-dark-card hover:bg-stone-100 dark:hover:bg-slate-800 border border-stone-200 dark:border-dark-border text-center transition-all cursor-pointer active:scale-95"
                >
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    {tier.score}
                  </div>
                  <div className="text-[10px] text-stone-500 font-medium truncate">
                    {tier.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. Auxiliary Drawer: Urgent Medical Symptoms (Expanded only when tapped) */}
        {activePanel === "urgent" && (
          <div className="flex-shrink-0 bg-white dark:bg-dark-surface rounded-2xl border border-rose-200 dark:border-rose-900 p-3.5 shadow-card animate-fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-400 mb-2 pb-1 border-b border-rose-100 dark:border-rose-950">
              <span>Select urgent condition to vocalize:</span>
              <button
                onClick={() => setActivePanel(null)}
                className="text-stone-400 hover:text-stone-600 text-xs px-2 py-0.5 cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {URGENT_SYMPTOMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSpeakPhrase(item.phrase, item.label)}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-left transition-all cursor-pointer active:scale-95"
                  >
                    <Icon size={16} className="text-rose-600 flex-shrink-0" />
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200 truncate">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Minimal 1-Tap Response Dock (Large, Calming, Effortless) */}
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          {/* Quick Yes */}
          <button
            type="button"
            onClick={() => handleSpeakPhrase("Yes, I understand.", "Yes")}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white dark:bg-dark-card border border-stone-200 dark:border-dark-border hover:border-emerald-500 hover:shadow-xs text-slate-900 dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span>Yes / Agree</span>
          </button>

          {/* Quick No */}
          <button
            type="button"
            onClick={() => handleSpeakPhrase("No, that is not correct.", "No")}
            className="flex items-center justify-center gap-2 py-3 px-3 rounded-2xl bg-white dark:bg-dark-card border border-stone-200 dark:border-dark-border hover:border-stone-400 hover:shadow-xs text-slate-900 dark:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95"
          >
            <div className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 flex items-center justify-center flex-shrink-0">
              <X size={12} strokeWidth={3} />
            </div>
            <span>No / Disagree</span>
          </button>

          {/* Pain Scale Toggle */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "pain" ? null : "pain")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 ${
              activePanel === "pain"
                ? "bg-amber-50 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200 ring-2 ring-amber-300"
                : "bg-white dark:bg-dark-card border-stone-200 dark:border-dark-border text-slate-900 dark:text-white hover:border-amber-400"
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 flex items-center justify-center flex-shrink-0">
              <Zap size={12} />
            </div>
            <span>Pain Level (0-10)</span>
          </button>

          {/* Urgent Help Toggle */}
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === "urgent" ? null : "urgent")}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 ${
              activePanel === "urgent"
                ? "bg-rose-50 dark:bg-rose-950/60 border-rose-400 text-rose-900 dark:text-rose-200 ring-2 ring-rose-300"
                : "bg-white dark:bg-dark-card border-stone-200 dark:border-dark-border text-slate-900 dark:text-white hover:border-rose-400"
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={12} />
            </div>
            <span>Urgent Help</span>
          </button>
        </div>

      </main>
    </div>
  );
}
