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
    <div className="bg-white/95 dark:bg-dark-surface rounded-2xl border border-warm-200 dark:border-dark-border shadow-card p-3.5 sm:p-4 transition-colors duration-300 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-hearing-600 text-white rounded-xl flex items-center justify-center text-xs shadow-xs">
            <svg
              className="w-4 h-4 text-white"
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
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-dark-text">
            Live Speech Transcript
          </h3>
        </div>
        <InfoTooltip content="Shows real-time voice transcription or typed English. Type text below or speak with the microphone to translate into sign." />
      </div>

      <div className="bg-warm-50/70 dark:bg-dark-card rounded-xl p-3 border border-warm-200/60 dark:border-dark-border shadow-xs transition-colors duration-300 flex-1 min-h-0 overflow-auto">
        <Transcript transcript={transcript} />
      </div>

      {/* Quick typed text input bar */}
      {onSendText && (
        <form onSubmit={handleSubmit} className="mt-2.5 flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isRecording ? "Listening to your voice…" : "Type English text to sign (e.g. Hello, how are you)…"}
            className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-dark-surface border border-warm-200 dark:border-dark-border rounded-xl text-slate-900 dark:text-dark-text placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-hearing-500 shadow-xs"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-3.5 py-1.5 text-xs font-semibold bg-hearing-600 hover:bg-hearing-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
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
