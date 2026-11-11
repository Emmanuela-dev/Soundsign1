import React, { useState, useRef, useEffect } from "react";
import { speakText, EMOTION_PROFILES } from "./ttsUtils";
import { getCachedSrc } from "../hooks/useVideoPreloader";
import { WORD_DATABASE } from "./wordDatabase";

// ── Medical & Clinical Vocabulary subset ──────────────────────────────────
const HEALTHCARE_WORDS = new Set([
  "Doctor", "Nurse", "Hospital", "Medicine", "Pill", "Pain", "Bleed",
  "Breathe", "Chest", "Head", "Heart", "Stomach", "Allergy", "Dizzy",
  "Fever", "Injection", "Surgery", "Scale", "Help", "Safe", "Better",
  "Stay", "Wash"
]);

const ESSENTIAL_WORDS = new Set([
  "Hello", "Thank You", "Welcome", "Good", "Great", "Help", "Safe",
  "Right", "Not", "Do Not", "Bye", "Happy", "Sad", "Beautiful", "Best"
]);

const DAILY_WORDS = new Set([
  "Eat", "Talk", "Learn", "Sign", "Sound", "Home", "Work", "Day", "Time",
  "Walk", "Computer", "Study", "Words", "World", "What", "When", "Where",
  "Why", "Who", "How", "Which", "Can", "Cannot"
]);

// ── Build complete 151 catalog from verified local mp4 recordings ─────────
export const ALL_SIGNS_CATALOG = [
  // 1. Vocabulary words (115)
  ...WORD_DATABASE.map((w) => {
    let category = "Vocabulary";
    if (HEALTHCARE_WORDS.has(w)) category = "Healthcare & Triage";
    else if (ESSENTIAL_WORDS.has(w)) category = "Essential Expressions";
    else if (DAILY_WORDS.has(w)) category = "Daily Life";

    return {
      id: `word_${w.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name: w,
      word: w,
      type: "word",
      category,
      path: `/videos/words/${w}.mp4`,
      language: "International Sign / ASL Reference",
      description: `Human-recorded sign demonstration for "${w}". Verified against the core vocabulary lexicon.`,
    };
  }),

  // 2. Numbers 0-9 (10)
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    id: `num_${n}`,
    name: `Number ${n}`,
    word: ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][n],
    number: String(n),
    type: "number",
    category: "Numbers (0–9)",
    path: `/videos/numbers/${n}.mp4`,
    language: "International Sign / ASL Reference",
    description: `Standard single-hand number demonstration for digit ${n}.`,
  })),

  // 3. Letters A-Z (26)
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => ({
    id: `letter_${l.toLowerCase()}`,
    name: `Letter ${l}`,
    word: `Letter ${l}`,
    letter: l,
    type: "letter",
    category: "Alphabet (A–Z)",
    path: `/videos/letters/${l}.mp4`,
    language: "Manual Alphabet Reference",
    description: `Manual alphabet fingerspelling handshape for letter "${l}". Used for proper nouns and names.`,
  })),
];

export default function SignLibrary({
  onSelectSign,
  onPracticeInCamera,
  onSendToConversation,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeSign, setActiveSign] = useState(ALL_SIGNS_CATALOG[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [voiceEmotion, setVoiceEmotion] = useState("gentle");

  const modalVideoRef = useRef(null);

  // Apply playback speed to video element
  useEffect(() => {
    if (modalVideoRef.current) {
      modalVideoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, activeSign]);

  // Categories list with counts
  const categories = [
    { id: "all", label: "All Signs", count: ALL_SIGNS_CATALOG.length },
    { id: "Essential Expressions", label: "Essential", count: ALL_SIGNS_CATALOG.filter((s) => s.category === "Essential Expressions").length },
    { id: "Healthcare & Triage", label: "Healthcare & Triage", count: ALL_SIGNS_CATALOG.filter((s) => s.category === "Healthcare & Triage").length },
    { id: "Daily Life", label: "Daily Life", count: ALL_SIGNS_CATALOG.filter((s) => s.category === "Daily Life").length },
    { id: "Alphabet (A–Z)", label: "Alphabet (A–Z)", count: 26 },
    { id: "Numbers (0–9)", label: "Numbers (0–9)", count: 10 },
  ];

  // Filtered signs
  const filteredSigns = ALL_SIGNS_CATALOG.filter((sign) => {
    const matchesCat = selectedCategory === "all" || sign.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      sign.name.toLowerCase().includes(q) ||
      sign.word.toLowerCase().includes(q) ||
      sign.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const handleOpenSign = (sign) => {
    setActiveSign(sign);
    setIsModalOpen(true);
    if (onSelectSign) onSelectSign(sign);
  };

  const handleSpeak = (text) => {
    speakText(text, voiceEmotion);
  };

  return (
    <div className="h-full flex flex-col bg-white/90 dark:bg-dark-surface rounded-2xl border border-warm-200 dark:border-dark-border shadow-card overflow-hidden">
      {/* ── Library Header & Search Bar ── */}
      <div className="p-4 sm:p-5 border-b border-warm-200 dark:border-dark-border flex-shrink-0 bg-warm-50/50 dark:bg-dark-card/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs"><BookOpen size={18} /></div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-dark-text">
                Sign Vocabulary Library
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warm-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-warm-200 dark:border-dark-border font-mono">
                {ALL_SIGNS_CATALOG.length} human recordings
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-dark-muted">
              Search verified sign demonstrations. Watch human recordings, adjust playback speed, and practice in the camera.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sign words (e.g. Doctor, Hello, Eat)..."
              className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-dark-surface border border-warm-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-dark-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-signing-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-white dark:bg-dark-surface text-slate-600 dark:text-slate-300 border border-warm-200 dark:border-dark-border hover:bg-warm-100"
              }`}
            >
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-70">({cat.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Sign Grid Catalog ── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        {filteredSigns.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Search size={32} className="text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800 dark:text-dark-text mb-1">
              No signs found for "{searchQuery}"
            </p>
            <p className="text-xs text-slate-500 dark:text-dark-muted mb-4">
              Try searching another word, or switch to the Alphabet tab to fingerspell unknown words.
            </p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="px-4 py-2 bg-warm-100 dark:bg-dark-card border border-warm-200 dark:border-dark-border rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-warm-200 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredSigns.map((sign) => (
              <div
                key={sign.id}
                onClick={() => handleOpenSign(sign)}
                className="group bg-white dark:bg-dark-card border border-warm-200 dark:border-dark-border rounded-xl p-3 shadow-xs hover:border-signing-500 dark:hover:border-signing-500 hover:shadow-subtle transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-warm-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] truncate">
                      {sign.type === "letter" ? "Alphabet" : sign.type === "number" ? "Number" : sign.category.split(" ")[0]}
                    </span>
                    <span className="text-slate-400 group-hover:text-signing-600 transition-colors text-xs font-bold">
                      ▶
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-dark-text group-hover:text-signing-600 dark:group-hover:text-signing-400 transition-colors">
                    {sign.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-dark-muted line-clamp-1 mt-0.5">
                    {sign.language}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-warm-100 dark:border-dark-border flex items-center justify-between text-[11px] text-slate-400">
                  <span className="group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    View Sign ↗
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Interactive Sign Demonstration Modal ── */}
      {isModalOpen && activeSign && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-dark-surface border border-warm-200 dark:border-dark-border rounded-2xl w-full max-w-2xl shadow-elevated overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-warm-200 dark:border-dark-border flex items-center justify-between flex-shrink-0 bg-warm-50 dark:bg-dark-card">
              <div className="flex items-center gap-2.5">
                <Play size={16} className="text-teal-600" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-dark-text">
                    Sign Demonstration: {activeSign.name}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-dark-muted">
                    {activeSign.language} · {activeSign.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-base p-1.5 cursor-pointer rounded-lg hover:bg-warm-100"
              >
                ✕
              </button>
            </div>

            {/* Modal Video Player Stage */}
            <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden flex-shrink-0">
              <video
                ref={modalVideoRef}
                src={getCachedSrc(activeSign.path)}
                autoPlay
                loop={isLooping}
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => {
                  if (!isLooping && modalVideoRef.current) {
                    modalVideoRef.current.currentTime = 0;
                  }
                }}
              />
              <div className="absolute bottom-2 left-3 bg-black/80 px-2.5 py-1 rounded-lg text-xs text-white font-bold backdrop-blur-sm">
                {activeSign.name}
              </div>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-3.5 sm:p-4 flex flex-col gap-3 flex-1 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-warm-200 dark:border-dark-border">
                {/* Replay & Loop */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (modalVideoRef.current) {
                        modalVideoRef.current.currentTime = 0;
                        modalVideoRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-3 py-1.5 bg-warm-100 hover:bg-warm-200 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-800 dark:text-dark-text rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={13} /> <span>Replay</span>
                  </button>
                  <button
                    onClick={() => setIsLooping(!isLooping)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                      isLooping
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold"
                        : "bg-warm-100 hover:bg-warm-200 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-800 dark:text-dark-text"
                    }`}
                  >
                    <Repeat size={13} /> <span>{isLooping ? "Looping On" : "Loop"}</span>
                  </button>
                </div>

                {/* Speed Controls */}
                <div className="flex items-center gap-1 bg-warm-100 dark:bg-dark-card p-1 rounded-xl text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Speed:</span>
                  {[0.5, 0.75, 1.0, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setPlaybackRate(rate)}
                      className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                        playbackRate === rate
                          ? "bg-signing-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                      }`}
                    >
                      {rate}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Sign Linguistic Description & Notes */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-dark-text uppercase tracking-wider mb-1">
                  Demonstration Notes
                </h4>
                <p className="text-xs text-slate-600 dark:text-dark-muted leading-relaxed">
                  {activeSign.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2 mt-auto">
                <button
                  onClick={() => handleSpeak(activeSign.word)}
                  className="px-3 py-2 rounded-xl bg-warm-100 hover:bg-warm-200 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-800 dark:text-dark-text text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Volume2 size={13} /> <span>Pronounce</span>
                </button>

                {onPracticeInCamera && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      onPracticeInCamera(activeSign);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Camera size={13} /> <span>Practice in Camera</span>
                  </button>
                )}

                {onSendToConversation && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      onSendToConversation(activeSign);
                    }}
                    className="px-4 py-2 rounded-xl bg-signing-600 hover:bg-signing-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <MessageSquare size={13} /> <span>Send to Conversation</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

