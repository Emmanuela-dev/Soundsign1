import React, { useState } from 'react';
import {
  HeartPulse, Wind, Droplet, Activity, Pill, ShieldAlert,
  AlertTriangle, Thermometer, ChevronRight, ChevronLeft,
  MapPin, Clock, History, CheckCircle2, Zap, RotateCcw,
} from 'lucide-react';

// ── Step definitions ──────────────────────────────────────────────────────────
const STEPS = ['complaint', 'location', 'severity', 'duration', 'history', 'allergies', 'done'];

const COMPLAINTS = [
  { id: 'chest_pain',  label: 'Chest Pain',      phrase: 'I have severe chest pain.',               icon: HeartPulse,   color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100' },
  { id: 'breathe',     label: "Can't Breathe",    phrase: 'I cannot breathe properly.',              icon: Wind,         color: 'text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100' },
  { id: 'bleed',       label: 'Bleeding',         phrase: 'I am bleeding.',                          icon: Droplet,      color: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
  { id: 'dizzy',       label: 'Dizzy / Faint',    phrase: 'I feel very dizzy and faint.',            icon: Activity,     color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100' },
  { id: 'allergy',     label: 'Severe Allergy',   phrase: 'I am having a severe allergic reaction.', icon: ShieldAlert,  color: 'text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { id: 'fever',       label: 'High Fever',       phrase: 'I have a very high fever.',               icon: Thermometer,  color: 'text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100' },
  { id: 'seizure',     label: 'Seizure / Fit',    phrase: 'I had a seizure.',                        icon: Zap,          color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
  { id: 'emergency',   label: 'Emergency Help',   phrase: 'Please call emergency help immediately.', icon: AlertTriangle, color: 'text-rose-700 bg-rose-100 border-rose-300 hover:bg-rose-200 font-semibold' },
  { id: 'medicine',    label: 'Need Medicine',    phrase: 'I urgently need my prescribed medicine.', icon: Pill,         color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
];

const LOCATIONS = [
  'Chest', 'Head', 'Stomach', 'Abdomen', 'Back', 'Neck', 'Throat',
  'Arm', 'Leg', 'Eye', 'Ear', 'Whole Body',
];

const PAIN_LEVELS = [
  { score: 0,  label: 'None',       color: 'bg-emerald-500' },
  { score: 2,  label: 'Mild',       color: 'bg-teal-500' },
  { score: 4,  label: 'Moderate',   color: 'bg-amber-500' },
  { score: 6,  label: 'Severe',     color: 'bg-orange-500' },
  { score: 8,  label: 'Very Severe',color: 'bg-rose-600' },
  { score: 10, label: 'Worst',      color: 'bg-red-700' },
];

const DURATIONS = [
  'Just now', 'A few minutes', '30 minutes', '1–2 hours', 'Half a day', 'Over a day',
];

const HISTORY = [
  'Heart disease', 'Diabetes', 'Asthma', 'High blood pressure', 'Epilepsy', 'None',
];

const ALLERGY_OPTIONS = [
  'Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa drugs', 'Latex', 'None',
];

// ── Priority scoring ──────────────────────────────────────────────────────────
const CRITICAL_IDS = new Set(['chest_pain', 'breathe', 'bleed', 'seizure', 'emergency']);
const URGENT_IDS   = new Set(['dizzy', 'allergy', 'fever']);

function computePriority(complaintId, severity) {
  if (CRITICAL_IDS.has(complaintId) || severity >= 8) return 'IMMEDIATE';
  if (URGENT_IDS.has(complaintId)   || severity >= 5) return 'URGENT';
  return 'NON-URGENT';
}

const PRIORITY_STYLES = {
  IMMEDIATE:  { bg: 'bg-red-600',    text: 'text-white', label: '🔴 IMMEDIATE — Life-threatening' },
  URGENT:     { bg: 'bg-orange-500', text: 'text-white', label: '🟠 URGENT — Needs prompt attention' },
  'NON-URGENT': { bg: 'bg-emerald-600', text: 'text-white', label: '🟢 NON-URGENT — Stable' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function speak(phrase) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(phrase);
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TriageWizard({ onTriageComplete }) {
  const [step, setStep]           = useState('complaint');
  const [complaint, setComplaint] = useState(null);   // { id, label, phrase }
  const [location, setLocation]   = useState(null);
  const [severity, setSeverity]   = useState(null);
  const [duration, setDuration]   = useState(null);
  const [history,  setHistory]    = useState([]);
  const [allergies,setAllergies]  = useState([]);

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => setStep(STEPS[stepIndex + 1]);
  const goBack = () => setStep(STEPS[stepIndex - 1]);
  const reset  = () => {
    setStep('complaint'); setComplaint(null); setLocation(null);
    setSeverity(null); setDuration(null); setHistory([]); setAllergies([]);
  };

  const toggleMulti = (arr, setArr, val) =>
    arr.includes(val) ? setArr(arr.filter(v => v !== val)) : setArr([...arr, val]);

  // Build triage record on completion
  const handleFinish = () => {
    const priority = computePriority(complaint?.id, severity ?? 0);
    const record = {
      chief_complaint: complaint?.phrase ?? '',
      complaint_id:    complaint?.id ?? '',
      location:        location ?? '',
      severity:        severity ?? 0,
      duration:        duration ?? '',
      history,
      allergies,
      priority,
      timestamp: new Date().toISOString(),
    };
    speak(complaint?.phrase ?? '');
    if (onTriageComplete) onTriageComplete(record);
    setStep('done');
  };

  // ── Step renderers ────────────────────────────────────────────────────────
  const renderComplaint = () => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-3">What is wrong? (tap one)</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {COMPLAINTS.map(c => {
          const Icon = c.icon;
          const selected = complaint?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => { setComplaint(c); speak(c.phrase); }}
              className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all active:scale-95 ${c.color} ${selected ? 'ring-2 ring-offset-1 ring-slate-700 scale-[1.02]' : ''}`}
            >
              <div className="p-1 rounded-lg bg-white/80 shadow-sm flex-shrink-0"><Icon size={15} /></div>
              <span className="text-xs font-medium leading-tight">{c.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end">
        <button
          onClick={goNext}
          disabled={!complaint}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-3">Where is the pain or problem?</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {LOCATIONS.map(loc => (
          <button
            key={loc}
            onClick={() => { setLocation(loc); speak(`The problem is in my ${loc}.`); }}
            className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
              location === loc
                ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-offset-1 ring-teal-400'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {loc}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={goBack} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /> Back</button>
        <button onClick={goNext} disabled={!location} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors">Next <ChevronRight size={16} /></button>
      </div>
    </div>
  );

  const renderSeverity = () => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-3">How bad is it? (0 = none, 10 = worst)</p>
      <div className="grid grid-cols-6 gap-2">
        {PAIN_LEVELS.map(p => {
          const sel = severity === p.score;
          return (
            <button
              key={p.score}
              onClick={() => { setSeverity(p.score); speak(`My pain level is ${p.score} out of 10, ${p.label}.`); }}
              className={`flex flex-col items-center py-2 rounded-xl border text-center transition-all active:scale-95 ${
                sel ? `${p.color} text-white border-transparent ring-2 ring-offset-1 ring-slate-700 scale-[1.02]` : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-sm font-bold">{p.score}</span>
              <span className="text-[10px] leading-tight mt-0.5">{p.label}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={goBack} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /> Back</button>
        <button onClick={goNext} disabled={severity === null} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors">Next <ChevronRight size={16} /></button>
      </div>
    </div>
  );

  const renderDuration = () => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-3">How long have you felt this way?</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DURATIONS.map(d => (
          <button
            key={d}
            onClick={() => { setDuration(d); speak(`I have had this for ${d}.`); }}
            className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
              duration === d
                ? 'bg-teal-600 text-white border-teal-600 ring-2 ring-offset-1 ring-teal-400'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={goBack} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /> Back</button>
        <button onClick={goNext} disabled={!duration} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors">Next <ChevronRight size={16} /></button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1">Any known medical conditions? <span className="font-normal text-slate-400">(select all that apply)</span></p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {HISTORY.map(h => {
          const sel = history.includes(h);
          return (
            <button
              key={h}
              onClick={() => toggleMulti(history, setHistory, h)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
                sel ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={goBack} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /> Back</button>
        <button onClick={goNext} disabled={history.length === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors">Next <ChevronRight size={16} /></button>
      </div>
    </div>
  );

  const renderAllergies = () => (
    <div>
      <p className="text-xs font-semibold text-slate-700 mb-1">Any drug allergies? <span className="font-normal text-slate-400">(select all that apply)</span></p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ALLERGY_OPTIONS.map(a => {
          const sel = allergies.includes(a);
          return (
            <button
              key={a}
              onClick={() => toggleMulti(allergies, setAllergies, a)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-medium transition-all active:scale-95 ${
                sel ? 'bg-teal-600 text-white border-teal-600' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {a}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-between">
        <button onClick={goBack} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"><ChevronLeft size={16} /> Back</button>
        <button onClick={handleFinish} disabled={allergies.length === 0} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-teal-700 transition-colors"><CheckCircle2 size={16} /> Submit</button>
      </div>
    </div>
  );

  const renderDone = () => {
    const priority = computePriority(complaint?.id, severity ?? 0);
    const pStyle = PRIORITY_STYLES[priority];
    return (
      <div className="text-center space-y-4">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${pStyle.bg} ${pStyle.text} text-sm font-bold ${priority === 'IMMEDIATE' ? 'animate-pulse' : ''}`}>
          {pStyle.label}
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-left space-y-2 text-xs text-slate-700">
          <div><span className="font-semibold text-slate-900">Complaint:</span> {complaint?.label}</div>
          <div><span className="font-semibold text-slate-900">Location:</span> {location}</div>
          <div><span className="font-semibold text-slate-900">Severity:</span> {severity}/10</div>
          <div><span className="font-semibold text-slate-900">Duration:</span> {duration}</div>
          {history.length > 0 && <div><span className="font-semibold text-slate-900">History:</span> {history.join(', ')}</div>}
          {allergies.length > 0 && <div><span className="font-semibold text-slate-900">Allergies:</span> {allergies.join(', ')}</div>}
        </div>
        <button onClick={reset} className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <RotateCcw size={15} /> New Triage
        </button>
      </div>
    );
  };

  // ── Step labels for progress bar ──────────────────────────────────────────
  const STEP_META = {
    complaint: { label: 'Complaint',  Icon: AlertTriangle },
    location:  { label: 'Location',   Icon: MapPin },
    severity:  { label: 'Severity',   Icon: Activity },
    duration:  { label: 'Duration',   Icon: Clock },
    history:   { label: 'History',    Icon: History },
    allergies: { label: 'Allergies',  Icon: ShieldAlert },
    done:      { label: 'Summary',    Icon: CheckCircle2 },
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5 mb-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
          <Zap size={18} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Guided Triage Intake</h3>
          <p className="text-xs text-slate-500">Step-by-step medical assessment</p>
        </div>
      </div>

      {/* Progress bar */}
      {step !== 'done' && (
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {STEPS.filter(s => s !== 'done').map((s, i) => {
            const { label, Icon } = STEP_META[s];
            const isActive = s === step;
            const isPast   = STEPS.indexOf(s) < stepIndex;
            return (
              <React.Fragment key={s}>
                <div className={`flex flex-col items-center gap-0.5 min-w-[44px] transition-all ${isActive ? 'opacity-100' : isPast ? 'opacity-70' : 'opacity-30'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isActive ? 'bg-teal-600 text-white' : isPast ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon size={13} />
                  </div>
                  <span className="text-[9px] font-medium text-slate-600 leading-tight text-center">{label}</span>
                </div>
                {i < STEPS.length - 2 && <div className={`flex-1 h-px min-w-[8px] ${isPast ? 'bg-teal-300' : 'bg-slate-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Step content */}
      {step === 'complaint' && renderComplaint()}
      {step === 'location'  && renderLocation()}
      {step === 'severity'  && renderSeverity()}
      {step === 'duration'  && renderDuration()}
      {step === 'history'   && renderHistory()}
      {step === 'allergies' && renderAllergies()}
      {step === 'done'      && renderDone()}
    </div>
  );
}
