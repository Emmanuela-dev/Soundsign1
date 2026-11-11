import { useState } from "react";
import Transcript from "./Transcript";
import InfoTooltip from "./InfoTooltip";

const LiveTranscriptSection = ({ transcript, onSendText, isRecording }) => {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (onSendText) {
      onSendText(inputText.trim());
      setInputText("");
    }
  };

  return (
    <div className="bg-white/80 dark:bg-[#000000] backdrop-blur-xl rounded-2xl border border-white/30 dark:border-[#004AFF]/30 shadow-xl p-4 sm:p-5 transition-colors duration-300 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 dark:bg-[#004AFF] rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[#DDE3E7] transition-colors duration-300">
            Live Transcript
          </h3>
        </div>
        <InfoTooltip content="This section shows real-time speech transcription or typed English. Type text below or use the mic button to translate and play signs." />
      </div>

      <div className="bg-slate-50 dark:bg-[#000000] rounded-xl p-4 border border-slate-200/50 dark:border-[#004AFF]/20 shadow-inner transition-colors duration-300 flex-1 min-h-0 overflow-auto">
        <Transcript transcript={transcript} />
      </div>

      {/* Quick typed text input bar */}
      {onSendText && (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Listening to your voice..." : "Type text to sign (e.g. Hello how are you)..."}
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#000000] border border-slate-200 dark:border-[#004AFF]/40 rounded-xl text-slate-800 dark:text-[#DDE3E7] placeholder-slate-400 dark:placeholder-[#DDE3E7]/40 focus:outline-none focus:ring-2 focus:ring-[#004AFF] transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-3.5 py-2 text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white dark:text-[#DDE3E7] rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Sign</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      )}
    </div>
  );
};

export default LiveTranscriptSection;