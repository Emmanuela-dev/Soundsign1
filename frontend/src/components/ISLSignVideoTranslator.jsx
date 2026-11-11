import React, { useState, useRef, useEffect } from "react";
import {
  Hand,
  HeartHandshake,
  Users,
  ThumbsUp,
  HelpCircle,
  CheckCircle2,
  Ban,
  Utensils,
  MessageSquare,
  ShieldCheck,
  Smile,
  Frown,
  BookOpen,
  Video,
  Volume2,
  Clock,
  Home,
  Briefcase,
  Sun,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Repeat,
  Camera,
  Search,
  X,
} from "lucide-react";
import { speakText, EMOTION_PROFILES } from "./ttsUtils";
import { WORD_DATABASE } from "./wordDatabase";
import { getCachedSrc } from "../hooks/useVideoPreloader";

const SIGN_ICON_MAP = {
  "Hello": Hand,
  "Thank You": HeartHandshake,
  "Welcome": Users,
  "Good": ThumbsUp,
  "Help": HelpCircle,
  "Right": CheckCircle2,
  "Not": Ban,
  "Eat": Utensils,
  "Talk": MessageSquare,
  "Safe": ShieldCheck,
  "Happy": Smile,
  "Sad": Frown,
  "Learn": BookOpen,
  "Sign": Video,
  "Sound": Volume2,
  "Time": Clock,
  "Home": Home,
  "Work": Briefcase,
  "Day": Sun,
  "Beautiful": Sparkles,
};

function SignVisual({ sign, className = "w-5 h-5 text-blue-600 dark:text-[#004AFF]" }) {
  if (!sign) return <Video className={className} />;
  if (sign.number !== undefined) {
    return (
      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-[#DDE3E7] font-mono font-bold text-[11px] border border-slate-300 dark:border-slate-700">
        #{sign.number}
      </span>
    );
  }
  if (sign.letter !== undefined) {
    return (
      <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono font-bold text-[11px] border border-blue-200 dark:border-blue-800/50">
        {sign.letter}
      </span>
    );
  }
  const IconComp = SIGN_ICON_MAP[sign.word] || Video;
  return <IconComp className={className} />;
}

// ── Essential high-frequency signs with rich descriptions ──────────────────
export const POPULAR_SIGNS = [
  { word: "Hello", iconName: "Hand", category: "Greetings", path: "/videos/words/Hello.mp4", description: "Open hand waved upright with palm facing forward" },
  { word: "Thank You", iconName: "HeartHandshake", category: "Courtesies", path: "/videos/words/Thank You.mp4", description: "Hand moves outward from chin/chest towards the recipient" },
  { word: "Welcome", iconName: "Users", category: "Greetings", path: "/videos/words/Welcome.mp4", description: "Both open hands extended forward in a warm welcoming arc" },
  { word: "Good", iconName: "ThumbsUp", category: "Expressions", path: "/videos/words/Good.mp4", description: "Hand moves from lips forward into affirmative gesture" },
  { word: "Help", iconName: "HelpCircle", category: "Essential", path: "/videos/words/Help.mp4", description: "Fist placed on flat palm and lifted upward together" },
  { word: "Right", iconName: "CheckCircle2", category: "Expressions", path: "/videos/words/Right.mp4", description: "Affirmative sign confirming correctness or agreement" },
  { word: "Not", iconName: "Ban", category: "Expressions", path: "/videos/words/Not.mp4", description: "Thumb flicks forward from under chin to indicate negation" },
  { word: "Eat", iconName: "Utensils", category: "Daily Life", path: "/videos/words/Eat.mp4", description: "Bunched fingertips bring food gesture towards mouth" },
  { word: "Talk", iconName: "MessageSquare", category: "Communication", path: "/videos/words/Talk.mp4", description: "Index finger moves outward from lips in conversational arc" },
  { word: "Safe", iconName: "ShieldCheck", category: "Essential", path: "/videos/words/Safe.mp4", description: "Crossed wrists open outward in protection and safety sign" },
  { word: "Happy", iconName: "Smile", category: "Emotions", path: "/videos/words/Happy.mp4", description: "Open palms brush upward against chest twice cheerfully" },
  { word: "Sad", iconName: "Frown", category: "Emotions", path: "/videos/words/Sad.mp4", description: "Open palms drop downward in front of face" },
  { word: "Learn", iconName: "BookOpen", category: "Education", path: "/videos/words/Learn.mp4", description: "Fingers pick information from flat palm to forehead" },
  { word: "Sign", iconName: "Video", category: "Communication", path: "/videos/words/Sign.mp4", description: "Both hands rotate in alternating circular sign motions" },
  { word: "Sound", iconName: "Volume2", category: "Communication", path: "/videos/words/Sound.mp4", description: "Index points to ear then moves outward in wave" },
  { word: "Time", iconName: "Clock", category: "Daily Life", path: "/videos/words/Time.mp4", description: "Index finger taps the back of opposite wrist like a watch" },
  { word: "Home", iconName: "Home", category: "Daily Life", path: "/videos/words/Home.mp4", description: "Fingertips tap chin then cheek in familiar motion" },
  { word: "Work", iconName: "Briefcase", category: "Daily Life", path: "/videos/words/Work.mp4", description: "One fist taps down on top of opposite wrist twice" },
  { word: "Day", iconName: "Sun", category: "Daily Life", path: "/videos/words/Day.mp4", description: "Forearm arcs downward like the sun across horizon" },
  { word: "Beautiful", iconName: "Sparkles", category: "Expressions", path: "/videos/words/Beautiful.mp4", description: "Open hand circles face and gathers into gentle fingertips" },
];

export const NUMBER_SIGNS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
  word: ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][n],
  number: String(n),
  category: "Numbers",
  path: `/videos/numbers/${n}.mp4`,
  description: `Official Indian Sign Language number sign for digit ${n}`,
}));

export const LETTER_SIGNS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => ({
  word: `Letter ${l}`,
  letter: l,
  category: "Alphabet",
  path: `/videos/letters/${l}.mp4`,
  description: `Official ISL manual alphabet sign for letter ${l}`,
}));

export const ALL_WORD_SIGNS = WORD_DATABASE.map((w) => ({
  word: w,
  category: "Vocabulary",
  path: `/videos/words/${w}.mp4`,
  description: `ISL human demonstration video for "${w}"`,
}));

export default function ISLSignVideoTranslator({
  onSendMessage,
  onSwitchToCamera,
  voiceEmotion = "soft",
  setVoiceEmotion,
  autoSpeak = true,
  setAutoSpeak,
  initialSign = null,
}) {
  const [selectedSign, setSelectedSign] = useState(
    initialSign || POPULAR_SIGNS[0]
  );
  const [activeTab, setActiveTab] = useState("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isSpeakingNow, setIsSpeakingNow] = useState(false);
  const [lastAnnouncedWord, setLastAnnouncedWord] = useState("");

  const videoRef = useRef(null);

  // Update selected sign if initialSign changes
  useEffect(() => {
    if (initialSign) {
      setSelectedSign(initialSign);
    }
  }, [initialSign]);

  // Handle playing video and updating speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.currentTime = 0;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [selectedSign, playbackRate]);

  // Execute Voice Synthesis & Message Send
  const handleTranslateAndSpeak = (signToSpeak = selectedSign) => {
    if (!signToSpeak) return;
    const phrase = signToSpeak.word || signToSpeak.letter || signToSpeak.number;
    setIsSpeakingNow(true);
    setLastAnnouncedWord(phrase);

    speakText(phrase, voiceEmotion);

    if (onSendMessage) {
      onSendMessage({
        sender: "gesture",
        text: phrase,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    setTimeout(() => {
      setIsSpeakingNow(false);
    }, 2000);
  };

  // Select a sign: auto-play video & speak if autoSpeak is enabled
  const handleSelectSign = (sign) => {
    setSelectedSign(sign);
    if (autoSpeak) {
      handleTranslateAndSpeak(sign);
    }
  };

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleReplay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
    if (autoSpeak) {
      handleTranslateAndSpeak(selectedSign);
    }
  };

  // Filter signs based on activeTab and searchQuery
  const getCatalogItems = () => {
    let items = [];
    if (activeTab === "popular") items = POPULAR_SIGNS;
    else if (activeTab === "all_words") items = ALL_WORD_SIGNS;
    else if (activeTab === "numbers") items = NUMBER_SIGNS;
    else if (activeTab === "letters") items = LETTER_SIGNS;

    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.word.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  };

  const catalogList = getCatalogItems();

  return (
    <div className="flex-1 min-h-0 flex flex-col xl:grid xl:grid-cols-12 gap-3 bg-slate-50 dark:bg-[#000000] rounded-2xl p-3 border border-slate-200 dark:border-[#004AFF]/30 overflow-hidden font-inter transition-colors duration-300">
      {/* ── Left Column: Big High-Definition Video Player Stage (Col 7 on xl) ── */}
      <div className="xl:col-span-7 flex flex-col gap-2 min-h-0 flex-shrink-0 xl:flex-shrink">
        {/* Stage Video Container */}
        <div className="relative rounded-2xl overflow-hidden bg-black border border-white/15 dark:border-white/20 shadow-2xl flex items-center justify-center min-h-[340px] sm:min-h-[420px] xl:min-h-[480px] flex-1">
          <video
            ref={videoRef}
            src={getCachedSrc(selectedSign.path)}
            loop={isLooping}
            playsInline
            muted
            className="w-full h-full object-contain max-h-[580px]"
            onEnded={() => {
              if (!isLooping) setIsPlaying(false);
            }}
          />

          {/* Top Status Badges */}
          <div className="absolute top-2.5 left-3 flex items-center gap-2 z-10">
            <div className="flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 dark:border-white/20 text-xs text-white dark:text-[#DDE3E7] font-mono shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold">ISL VIDEO GROUND TRUTH</span>
              <span className="text-[10px] text-emerald-400 font-semibold">(100% ACCURACY)</span>
            </div>
          </div>

          {/* Active Gesture Word Banner (Overlay on Video) */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 bg-black/80 backdrop-blur-md p-2.5 rounded-xl border border-white/10 dark:border-white/20 text-white z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <SignVisual sign={selectedSign} className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-[#DDE3E7] truncate leading-tight">
                    {selectedSign.word}
                  </h4>
                  <span className="text-[10px] bg-white/20 dark:bg-white/20 text-white px-2 py-0.5 rounded-full uppercase font-mono">
                    {selectedSign.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 dark:text-[#DDE3E7]/70 truncate">
                  {selectedSign.description || "Human Sign Language Demonstration"}
                </p>
              </div>
            </div>

            {/* Quick Actions in Banner */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleTranslateAndSpeak(selectedSign)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                  isSpeakingNow
                    ? "bg-emerald-500 text-white animate-pulse"
                    : "bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-white"
                }`}
                title="Speak translation out loud"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isSpeakingNow ? "Speaking…" : "Speak Voice"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video Player Action Controls Strip */}
        <div className="flex items-center justify-between gap-2 p-2 bg-white dark:bg-[#000000] rounded-xl border border-slate-200 dark:border-[#004AFF]/30 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Play/Pause */}
            <button
              onClick={handleTogglePlay}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-[#004AFF]/20 text-slate-700 dark:text-[#DDE3E7] text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
              title={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>

            {/* Replay */}
            <button
              onClick={handleReplay}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-[#004AFF]/20 text-slate-700 dark:text-[#DDE3E7] text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1"
              title="Replay video and re-announce voice"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Replay</span>
            </button>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                isLooping
                  ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7]"
                  : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-slate-200"
              }`}
              title="Repeat video continuously"
            >
              <Repeat className="w-3 h-3" />
              <span>Loop {isLooping ? "ON" : "OFF"}</span>
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 dark:text-[#DDE3E7]/60 font-semibold mr-1">Speed:</span>
            {[0.75, 1.0, 1.25].map((rate) => (
              <button
                key={rate}
                onClick={() => setPlaybackRate(rate)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                  playbackRate === rate
                    ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7]"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-slate-200"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Try in Camera Practice Button */}
          {onSwitchToCamera && (
            <button
              onClick={onSwitchToCamera}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all hover:scale-102"
              title="Switch to camera view and practice signing this gesture"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Practice in Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Right Column: Sign Library & Search Browser (Col 5 on xl) ── */}
      <div className="xl:col-span-5 flex flex-col min-h-[300px] xl:min-h-0 h-full bg-white dark:bg-[#000000] rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-[#004AFF]/30 overflow-hidden flex-1">
        {/* Top Search Bar */}
        <div className="relative mb-2 flex-shrink-0">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ISL sign video (e.g. Hello, Thank You, 4, B)..."
            className="w-full pl-7 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-[#000000] border border-slate-300 dark:border-[#004AFF]/40 rounded-xl text-slate-900 dark:text-[#DDE3E7] placeholder-slate-400 dark:placeholder-[#DDE3E7]/40 focus:outline-none focus:ring-2 focus:ring-[#004AFF]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab Selector Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-2 flex-shrink-0">
          {[
            { id: "popular", label: `Essential (${POPULAR_SIGNS.length})` },
            { id: "all_words", label: `Words (${ALL_WORD_SIGNS.length})` },
            { id: "numbers", label: `Numbers (0–9)` },
            { id: "letters", label: `Alphabet (A–Z)` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-xs"
                  : "text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-slate-100 dark:hover:bg-[#004AFF]/20"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Informative Guidance Banner */}
        <div className="mb-2 p-1.5 px-2 rounded-lg bg-blue-50 dark:bg-[#000000] border border-blue-200 dark:border-[#004AFF]/30 text-[11px] text-blue-900 dark:text-[#DDE3E7]/80 flex items-center justify-between flex-shrink-0">
          <span>Click any sign to play its video & speak voice:</span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-[#DDE3E7]/60">
            {catalogList.length} signs
          </span>
        </div>

        {/* Grid of Sign Cards */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2 gap-1.5 pr-1">
          {catalogList.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-slate-500 dark:text-[#DDE3E7]/60">
              No signs found matching "{searchQuery}"
            </div>
          ) : (
            catalogList.map((sign, idx) => {
              const isSelected = selectedSign.path === sign.path;
              return (
                <button
                  key={`${sign.path}-${idx}`}
                  onClick={() => handleSelectSign(sign)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
                    isSelected
                      ? "bg-blue-50 dark:bg-[#004AFF]/20 border-blue-500 dark:border-[#004AFF] shadow-sm ring-1 ring-blue-400 dark:ring-[#004AFF]"
                      : "bg-slate-50 dark:bg-[#000000] border-slate-200 dark:border-[#004AFF]/20 hover:border-blue-400 dark:hover:border-[#004AFF]"
                  }`}
                  title={`Play sign for "${sign.word}" and speak voice`}
                >
                  <div className="flex items-start justify-between gap-1 w-full mb-1">
                    <SignVisual sign={sign} className="w-4 h-4 text-slate-700 dark:text-slate-300 group-hover:text-blue-600 group-hover:scale-110 transition-transform" />
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#004AFF] animate-ping" />
                    )}
                  </div>
                  <div>
                    <h5
                      className={`text-xs font-bold leading-tight truncate ${
                        isSelected
                          ? "text-blue-700 dark:text-[#DDE3E7]"
                          : "text-slate-800 dark:text-[#DDE3E7]"
                      }`}
                    >
                      {sign.word}
                    </h5>
                    <span className="text-[10px] text-slate-400 dark:text-[#DDE3E7]/50 block truncate">
                      {sign.category}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
