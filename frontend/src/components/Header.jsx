import React from "react";
import ThemeToggle from "./ThemeToggle";
import Microphone from "./Microphone";

const Header = ({
  isRecording,
  toggleRecording,
  activeTab = "conversation",
}) => {
  const getTabTitle = () => {
    switch (activeTab) {
      case "camera":
        return {
          title: "Sign Camera Workspace",
          subtitle: "Optical Hand Tracking · Real-Time Gesture-to-Speech",
        };
      case "library":
        return {
          title: "Sign Vocabulary Library",
          subtitle: "151 Human Sign Demonstrations · Alphabet & Medical Lexicon",
        };
      case "conversation":
      default:
        return {
          title: "Two-Way Conversation Bridge",
          subtitle: "Speech & Sign Language Accessibility Interface",
        };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <header className="bg-white/80 dark:bg-dark-surface/90 backdrop-blur-md border-b border-warm-200 dark:border-dark-border px-4 py-2.5 transition-colors select-none">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Section Header */}
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-dark-text tracking-tight truncate">
            {title}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-dark-muted truncate hidden sm:block">
            {subtitle}
          </p>
        </div>

        {/* Center: Quick Microphone Control (Prominent in Conversation mode) */}
        {activeTab === "conversation" && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Microphone
                isRecording={isRecording}
                toggleRecording={toggleRecording}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden md:inline">
              {isRecording ? "Listening…" : "Click to Speak"}
            </span>
          </div>
        )}

        {/* Right: Status Pill & Theme Toggle */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warm-100 dark:bg-dark-card border border-warm-200 dark:border-dark-border text-[11px] font-mono text-slate-600 dark:text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready</span>
          </div>
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
