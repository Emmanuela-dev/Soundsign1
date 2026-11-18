import React, { useState } from 'react';
import {
  HeartPulse,
  Wind,
  Droplet,
  Activity,
  Pill,
  ShieldAlert,
  AlertTriangle,
  Thermometer,
  Volume2,
  CheckCircle2,
  Zap,
} from 'lucide-react';

const TRIAGE_SYMPTOMS = [
  { id: 'chest_pain', label: 'Chest Pain', phrase: 'I am experiencing severe chest pain.', icon: HeartPulse, color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { id: 'breathe', label: "Can't Breathe", phrase: 'I am having serious trouble breathing.', icon: Wind, color: 'text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100' },
  { id: 'bleed', label: 'Bleeding', phrase: 'I am bleeding and need immediate help.', icon: Droplet, color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
  { id: 'dizzy', label: 'Dizzy / Faint', phrase: 'I feel extremely dizzy and faint.', icon: Activity, color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { id: 'allergy', label: 'Severe Allergy', phrase: 'I have a serious allergic reaction.', icon: ShieldAlert, color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { id: 'fever', label: 'High Fever', phrase: 'I have a very high fever and chills.', icon: Thermometer, color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
  { id: 'medicine', label: 'Need Medicine', phrase: 'I urgently need my prescribed medication.', icon: Pill, color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
  { id: 'emergency', label: 'Emergency Help', phrase: 'Please call emergency medical assistance immediately.', icon: AlertTriangle, color: 'text-rose-700 bg-rose-100 border-rose-300 hover:bg-rose-200 font-semibold' },
];

const PAIN_LEVELS = [
  { score: 0, label: 'No Pain', desc: 'Comfortable', color: 'bg-emerald-500 text-white', border: 'border-emerald-500' },
  { score: 2, label: 'Mild', desc: 'Noticeable', color: 'bg-teal-500 text-white', border: 'border-teal-500' },
  { score: 4, label: 'Moderate', desc: 'Distracting', color: 'bg-amber-500 text-white', border: 'border-amber-500' },
  { score: 6, label: 'Severe', desc: 'Interrupts focus', color: 'bg-orange-500 text-white', border: 'border-orange-500' },
  { score: 8, label: 'Very Severe', desc: 'Hard to move', color: 'bg-rose-600 text-white', border: 'border-rose-600' },
  { score: 10, label: 'Worst', desc: 'Unbearable', color: 'bg-red-700 text-white', border: 'border-red-700' },
];

export default function ClinicalTriagePanel({ onTriggerPhrase }) {
  const [activePain, setActivePain] = useState(null);
  const [lastVocalized, setLastVocalized] = useState('');

  const speak = (phrase) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectSymptom = (item) => {
    speak(item.phrase);
    setLastVocalized(item.phrase);
    if (onTriggerPhrase) {
      onTriggerPhrase({
        text: item.phrase,
        sender: 'patient',
        category: 'clinical_emergency',
        label: item.label,
      });
    }
  };

  const handleSelectPain = (level) => {
    setActivePain(level.score);
    const phrase = `Patient reports pain level ${level.score} out of 10: ${level.label} (${level.desc}).`;
    speak(phrase);
    setLastVocalized(phrase);
    if (onTriggerPhrase) {
      onTriggerPhrase({
        text: phrase,
        sender: 'patient',
        category: 'pain_assessment',
        label: `Pain ${level.score}/10: ${level.label}`,
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">1-Touch Emergency Triage & Pain Scale</h3>
            <p className="text-xs text-slate-500">Tap any symptom or pain tier to speak immediately and show sign translation</p>
          </div>
        </div>

        {lastVocalized && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-medium border border-teal-200 animate-pulse">
            <Volume2 size={13} />
            <span>Spoken: "{lastVocalized.slice(0, 32)}..."</span>
          </div>
        )}
      </div>

      {/* 0-10 Clinical Pain Assessment Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-2">
          <span className="flex items-center gap-1 text-slate-900 font-semibold">
            <span>Visual Pain Score:</span>
            {activePain !== null ? (
              <span className="text-teal-700 font-bold">{activePain} / 10</span>
            ) : (
              <span className="text-slate-400 font-normal">Select severity</span>
            )}
          </span>
          <span className="text-slate-400">0 (No pain) to 10 (Worst possible)</span>
        </div>

        <div className="grid grid-cols-6 gap-2">
          {PAIN_LEVELS.map((level) => {
            const isSelected = activePain === level.score;
            return (
              <button
                key={level.score}
                type="button"
                onClick={() => handleSelectPain(level)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-center transition-all ${
                  isSelected
                    ? `${level.color} shadow-sm ring-2 ring-offset-1 ring-slate-800 font-bold scale-[1.02]`
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                }`}
                title={`Level ${level.score}: ${level.label} - ${level.desc}`}
              >
                <span className="text-sm sm:text-base font-bold">{level.score}</span>
                <span className="text-[11px] sm:text-xs leading-tight truncate w-full mt-0.5">{level.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rapid Emergency Symptoms Grid */}
      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Instant Clinical Symptoms</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TRIAGE_SYMPTOMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSymptom(item)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all active:scale-95 ${item.color}`}
              >
                <div className="p-1 rounded-lg bg-white/80 shadow-2xs">
                  <Icon size={16} />
                </div>
                <span className="text-xs font-medium leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

