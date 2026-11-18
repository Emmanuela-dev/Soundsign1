import InfoTooltip from "./InfoTooltip";

const ISLGlossSection = ({ isl, onReplay }) => {
  return (
    <div className="bg-white/95 dark:bg-dark-surface rounded-2xl border border-warm-200 dark:border-dark-border shadow-card p-3.5 sm:p-4 transition-colors duration-300 h-full flex flex-col">
      <div className="flex items-center justify-between mb-2.5 flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-signing-600 text-white rounded-xl flex items-center justify-center text-xs shadow-xs">
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
                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-8 14v2a1 1 0 001 1h8a1 1 0 001-1v-2M5 8h14l-1 8H6L5 8z"
              />
            </svg>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-dark-text">
            Sign Gloss Sequence
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isl && onReplay && (
            <button
              onClick={onReplay}
              className="px-2.5 py-1 text-xs font-semibold text-signing-700 dark:text-signing-300 bg-signing-50 hover:bg-signing-100 dark:bg-signing-950/40 border border-signing-200 dark:border-signing-800 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              title="Replay these signs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Replay</span>
            </button>
          )}
          <InfoTooltip content="Sign Gloss represents the grammatical sequence of sign tokens. Click 'Replay' to watch the avatar demonstrate this sequence again." />
        </div>
      </div>
      <div className="bg-warm-50/70 dark:bg-dark-card rounded-xl p-3 border border-warm-200/60 dark:border-dark-border shadow-xs transition-colors duration-300 flex-1 min-h-0 overflow-auto">
        <p className="text-slate-800 dark:text-dark-text font-mono text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium transition-colors duration-300">
          {isl || (
            <span className="text-slate-400 dark:text-dark-muted italic flex items-center space-x-2 font-sans text-xs transition-colors duration-300">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 7h14l-1 10H6L5 7z"
                />
              </svg>
              <span>Sign gloss will appear here as words are translated…</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ISLGlossSection;
