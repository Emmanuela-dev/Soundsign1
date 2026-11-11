import ThemeToggle from './ThemeToggle';
import Microphone from './Microphone';
import { Stethoscope, ArrowLeftRight, Video } from 'lucide-react';

const Header = ({ isRecording, toggleRecording, isProcessing, mode = "translator", setMode }) => {
  return (
    <header className="relative bg-white/70 dark:bg-[#000000]/90 backdrop-blur-lg border-b border-white/20 dark:border-[#004AFF]/25 shadow-lg transition-colors duration-300">
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        {/* Mobile Layout - Stacked */}
        <div className="sm:hidden flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 
                className="text-lg font-bold text-blue-700 dark:text-[#DDE3E7] cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5"
                onClick={() => window.location.reload()}
              >
                <span>SoundSigns</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  MedIntake
                </span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {setMode && (
                <div className="flex items-center bg-slate-100 dark:bg-[#000000] p-0.5 rounded-lg border border-slate-200 dark:border-[#004AFF]/30 text-xs">
                  <button
                    onClick={() => setMode("medical")}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                      mode === "medical"
                        ? "bg-cyan-500 text-slate-950 shadow-xs"
                        : "text-slate-500 dark:text-[#DDE3E7]/60 hover:dark:text-[#DDE3E7]"
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Intake</span>
                  </button>
                  <button
                    onClick={() => setMode("twoway")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                      mode === "twoway"
                        ? "bg-blue-600 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7] shadow-xs"
                        : "text-slate-500 dark:text-[#DDE3E7]/60 hover:dark:text-[#DDE3E7]"
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>2-Way</span>
                  </button>
                  <button
                    onClick={() => setMode("translator")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                      mode === "translator"
                        ? "bg-white dark:bg-[#004AFF] text-blue-700 dark:text-[#DDE3E7] shadow-xs"
                        : "text-slate-500 dark:text-[#DDE3E7]/60 hover:dark:text-[#DDE3E7]"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>1-Way</span>
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
              className="text-xl md:text-2xl font-bold text-blue-700 dark:text-[#DDE3E7] cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
              onClick={() => window.location.reload()}
            >
              <span>SoundSigns</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 tracking-wider uppercase font-mono">
                MedIntake
              </span>
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
                  onClick={() => setMode("medical")}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === "medical"
                      ? "bg-cyan-500 text-slate-950 shadow-md font-black ring-1 ring-cyan-300"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-slate-900 dark:hover:text-[#DDE3E7]"
                  }`}
                  title="Medical-Grade Clinical Intake & Triage System"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>Medical Intake</span>
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
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Two-Way</span>
                </button>
                <button
                  onClick={() => setMode("translator")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    mode === "translator"
                      ? "bg-white dark:bg-[#004AFF] text-blue-700 dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-slate-900 dark:hover:text-[#DDE3E7]"
                  }`}
                  title="Speech to ISL Sign Translation"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Translate</span>
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