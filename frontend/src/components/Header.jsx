import ThemeToggle from './ThemeToggle';
import Microphone from './Microphone';

const Header = ({ isRecording, toggleRecording, isProcessing, mode = "translator", setMode }) => {
  return (
    <header className="relative bg-white/70 dark:bg-[#000000]/90 backdrop-blur-lg border-b border-white/20 dark:border-[#004AFF]/25 shadow-lg transition-colors duration-300">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        {/* Mobile Layout - Stacked */}
        <div className="sm:hidden flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 
                className="text-lg font-bold text-blue-700 dark:text-[#DDE3E7] cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.location.reload()}
              >
                SoundSigns
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {setMode && (
                <div className="flex items-center bg-slate-100 dark:bg-[#000000] p-0.5 rounded-lg border border-slate-200 dark:border-[#004AFF]/30 text-xs">
                  <button
                    onClick={() => setMode("translator")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      mode === "translator"
                        ? "bg-white dark:bg-[#004AFF] text-blue-700 dark:text-[#DDE3E7] shadow-xs"
                        : "text-slate-500 dark:text-[#DDE3E7]/60 hover:dark:text-[#DDE3E7]"
                    }`}
                  >
                    1-Way
                  </button>
                  <button
                    onClick={() => setMode("twoway")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      mode === "twoway"
                        ? "bg-blue-600 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7] shadow-xs"
                        : "text-slate-500 dark:text-[#DDE3E7]/60 hover:dark:text-[#DDE3E7]"
                    }`}
                  >
                    2-Way
                  </button>
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 dark:bg-[#004AFF]/20 rounded-full blur-lg animate-pulse"></div>
              <div className="relative">
                <Microphone
                  isRecording={isRecording}
                  toggleRecording={toggleRecording}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Layout - Grid */}
        <div className="hidden sm:grid grid-cols-12 items-center gap-3">
          {/* Left - Title */}
          <div className="col-span-4 min-w-0 flex items-center gap-3">
            <h1 
              className="text-xl md:text-2xl font-bold text-blue-700 dark:text-[#DDE3E7] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.location.reload()}
            >
              SoundSigns
            </h1>
          </div>

          {/* Center - Microphone */}
          <div className="col-span-4 justify-self-center">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 dark:bg-[#004AFF]/20 rounded-full blur-lg animate-pulse"></div>
              <div className="relative">
                <Microphone
                  isRecording={isRecording}
                  toggleRecording={toggleRecording}
                />
              </div>
            </div>
          </div>

          {/* Right - Mode Switcher & Theme Toggle */}
          <div className="col-span-4 justify-self-end flex items-center gap-2.5">
            {setMode && (
              <div className="flex items-center bg-slate-100 dark:bg-[#000000] p-1 rounded-xl border border-slate-200 dark:border-[#004AFF]/30 shadow-xs">
                <button
                  onClick={() => setMode("translator")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === "translator"
                      ? "bg-white dark:bg-[#004AFF] text-blue-700 dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-slate-900 dark:hover:text-[#DDE3E7]"
                  }`}
                  title="Speech to ISL Sign Translation"
                >
                  <span className="emoji">🤟</span>
                  <span>Translate</span>
                </button>
                <button
                  onClick={() => setMode("twoway")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === "twoway"
                      ? "bg-blue-600 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-slate-900 dark:hover:text-[#DDE3E7]"
                  }`}
                  title="Two-Way Conversation Bridge (Hearing ↔ Gesture)"
                >
                  <span className="emoji">🔄</span>
                  <span>Two-Way</span>
                </button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;