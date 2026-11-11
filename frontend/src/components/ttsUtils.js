// ─────────────────────────────────────────────────────────────────────────────
// ttsUtils.js — Sentimental Human-Like Web Speech Synthesis Helper
// Synthesizes warm, emotionally expressive, human-like voice for gesture communication.
// ─────────────────────────────────────────────────────────────────────────────

// Human Emotion Profiles: modulates pitch, rate, and expressive inflection
export const EMOTION_PROFILES = {
  soft: {
    id: "soft",
    label: "Soft",
    shortLabel: "Soft",
    basePitch: 1.08,
    baseRate: 0.92,
    volume: 1.0,
    description: "Heartfelt, caring human warmth and expressive inflection",
  },
  friendly: {
    id: "friendly",
    label: "Friendly",
    shortLabel: "Friendly",
    basePitch: 1.12,
    baseRate: 0.95,
    volume: 1.0,
    description: "Upbeat, energetic and welcoming cadence",
  },
  gentle: {
    id: "gentle",
    label: "Gentle",
    shortLabel: "Gentle",
    basePitch: 0.98,
    baseRate: 0.88,
    volume: 0.95,
    description: "Soft, patient, and soothing human tone",
  },
};

// Backward-compatible non-enumerable alias so Object.values() has exactly 3 entries
Object.defineProperty(EMOTION_PROFILES, "sentimental", {
  get() {
    return EMOTION_PROFILES.soft;
  },
  enumerable: false,
});

/**
 * Maps raw sign words to emotionally expressive human phrases and inflections
 */
export const humanizeSignPhrase = (text, emotion = "soft") => {
  const t = (text || "").trim();
  const lower = t.toLowerCase();

  if (emotion === "soft" || emotion === "sentimental") {
    if (lower === "hello") return "Hello! Wonderful to see you.";
    if (lower === "thank you") return "Thank you so much, I truly appreciate it!";
    if (lower === "yes" || lower === "yes, good") return "Yes, that's wonderful!";
    if (lower === "no") return "No, I'm sorry.";
    if (lower === "i understand") return "I understand completely.";
    if (lower === "please repeat") return "Could you please repeat that?";
    if (lower === "wait a moment") return "Please wait just a moment...";
    if (lower === "sign language" || lower === "i sign") return "I communicate using sign language, thank you for connecting with me.";
    if (lower === "nice to meet you") return "It is so nice to meet you!";
    if (lower === "good") return "That is really good!";
    if (lower === "help") return "Please, I need a little help!";
    if (lower === "goodbye") return "Goodbye! Take care.";
    if (lower === "two / peace") return "Peace and harmony.";
    if (lower === "call me / later") return "Please call me later!";
    if (lower === "yes, agree") return "Yes, I completely agree.";
    if (lower === "you / one") return "You!";
  } else if (emotion === "friendly") {
    if (lower === "hello") return "Hello! Great to connect with you!";
    if (lower === "thank you") return "Thank you so much!";
    if (lower === "yes" || lower === "yes, good") return "Yes, awesome!";
    if (lower === "good") return "That's great!";
    if (lower === "goodbye") return "See you soon! Have a great day!";
  } else if (emotion === "gentle") {
    if (lower === "hello") return "Hello. It is good to see you.";
    if (lower === "thank you") return "Thank you very much.";
    if (lower === "wait a moment") return "Just a moment, please.";
  }

  // If already a sentence, ensure warm human punctuation
  if (!/[.!?]$/.test(t)) {
    return `${t}!`;
  }
  return t;
};

/**
 * Finds the highest quality, most natural and sentimental human voice available
 */
export const getBestHumanVoice = () => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // Rank 1: Neural & Natural Human Voices (Windows Edge/Chrome Neural: Jenny, Aria, Guy, Sonia)
  const neuralNaturalVoice = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Online")) &&
      (v.name.includes("Jenny") || v.name.includes("Aria") || v.name.includes("Guy") || v.name.includes("Sonia"))
  );
  if (neuralNaturalVoice) return neuralNaturalVoice;

  // Rank 2: Google US/UK English or Apple Samantha/Karen (expressive female/warm voices)
  const warmGoogleApple = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Google US English") ||
        v.name.includes("Google UK English Female") ||
        v.name.includes("Samantha") ||
        v.name.includes("Karen") ||
        v.name.includes("Victoria") ||
        v.name.includes("Zira"))
  );
  if (warmGoogleApple) return warmGoogleApple;

  // Rank 3: Any Natural or Google voice
  const anyNatural = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Microsoft"))
  );
  if (anyNatural) return anyNatural;

  // Rank 4: Any English voice
  return voices.find((v) => v.lang.startsWith("en")) || voices[0];
};

/**
 * Speaks text aloud with sentimental, human-like warmth, prosody, and natural inflection
 * @param {string} text - text to speak
 * @param {string} emotion - "sentimental" | "friendly" | "gentle"
 * @param {number|null} customRate - optional speed override
 * @param {number|null} customPitch - optional pitch override
 */
export const speakText = (text, emotion = "soft", customRate = null, customPitch = null) => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis is not supported by this browser.");
    return false;
  }

  const clean = (text || "").trim();
  if (!clean) return false;

  try {
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const profile = EMOTION_PROFILES[emotion] || EMOTION_PROFILES.soft;
    const humanized = humanizeSignPhrase(clean, emotion);

    const utterance = new SpeechSynthesisUtterance(humanized);
    utterance.rate = customRate ?? profile.baseRate; // Human pacing (natural, measured)
    utterance.pitch = customPitch ?? profile.basePitch; // Warm, sentimental human pitch
    utterance.volume = profile.volume;

    const voice = getBestHumanVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onerror = (e) => {
      console.warn("TTS utterance error:", e);
    };

    window.speechSynthesis.speak(utterance);
    return humanized;
  } catch (err) {
    console.error("Speech synthesis failed:", err);
    return false;
  }
};
