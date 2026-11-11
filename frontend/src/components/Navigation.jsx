import React from "react";
import ThemeToggle from "./ThemeToggle";
import { MessageSquare, Camera, BookOpen, Hand, ShieldCheck } from "lucide-react";

/**
 * Navigation
 * Accessible dual-mode navigation (Apple / Google Health Design Standard):
 * - Zero raw Unicode emojis. Crisp, semantic Lucide vector icons.
 * - Desktop: Left sidebar rail with brand identity, core destinations, and clinical engine status.
 * - Mobile: Fixed bottom navigation bar with >= 48px accessible touch targets and active indicator pills.
 */
export default function Navigation({ activeTab, setActiveTab }) {
  const navItems = [
    {
      id: "conversation",
      label: "Conversation",
      icon: MessageSquare,
      description: "Speech-to-sign & clinical dialogue",
    },
    {
      id: "camera",
      label: "Sign Camera",
      icon: Camera,
      description: "Dedicated full-frame signing stage",
    },
    {
      id: "library",
      label: "Sign Library",
      icon: BookOpen,
      description: "Search 151 human demonstrations",
    },
  ];

  return (
    <>
      {/* ── Desktop Left Sidebar Rail (Hidden on Mobile) ── */}
      <aside className="hidden lg:flex flex-col justify-between w-64 bg-white/95 dark:bg-dark-surface border-r border-warm-200 dark:border-dark-border p-4 flex-shrink-0 transition-colors select-none">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Hand size={20} className="stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-dark-text tracking-tight flex items-center gap-1.5">
                <span>SoundSigns</span>
              </h1>
              <span className="text-[11px] text-teal-700 dark:text-teal-400 font-semibold uppercase tracking-wider">
                Clinical & Sign Bridge
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-card font-medium"
                  }`}
                >
                  <Icon
                    size={20}
                    className={`flex-shrink-0 ${
                      isActive ? "text-teal-300 dark:text-teal-600" : "text-slate-500 dark:text-slate-400"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm tracking-tight">{item.label}</div>
                    <div
                      className={`text-[11px] truncate ${
                        isActive
                          ? "text-slate-300 dark:text-slate-600"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Sidebar Footer */}
        <div className="pt-4 border-t border-warm-200 dark:border-dark-border space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-dark-muted font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Vision Engine Ready</span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-dark-card border border-slate-200/80 dark:border-dark-border text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
            <ShieldCheck size={16} className="text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">Clinical Integrity:</span>{" "}
              Verified sign recordings. Assisted gesture recognition for high-stress triage.
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Header (Minimalist) ── */}
      <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white/95 dark:bg-dark-surface border-b border-warm-200 dark:border-dark-border flex-shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Hand size={17} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-dark-text leading-none">
              SoundSigns
            </h1>
            <span className="text-[10px] text-slate-500 dark:text-dark-muted">
              {navItems.find((n) => n.id === activeTab)?.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* ── Mobile Bottom Navigation Bar (Fixed, Accessible) ── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-t border-warm-200 dark:border-dark-border px-3 py-1.5 flex items-center justify-around z-40 select-none shadow-elevated"
        aria-label="Mobile Navigation"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1 px-2 flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer min-h-[48px] ${
                isActive
                  ? "text-teal-700 dark:text-white font-bold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              <Icon
                size={19}
                className={`transition-transform ${isActive ? "scale-110 text-teal-600 dark:text-white" : ""}`}
              />
              <span className="text-[11px] tracking-tight leading-none">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-white mt-0.5" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
