import InfoTooltip from "./InfoTooltip";

const ISLGlossSection = ({ isl, onReplay }) => {
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
                d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-8 14v2a1 1 0 001 1h8a1 1 0 001-1v-2M5 8h14l-1 8H6L5 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-[#DDE3E7] transition-colors duration-300">
            ISL Gloss
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isl && onReplay && (
            <button
              onClick={onReplay}
              className="px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-[#DDE3E7] bg-blue-100 hover:bg-blue-200 dark:bg-[#004AFF]/20 dark:hover:bg-[#004AFF]/30 border border-transparent dark:border-[#004AFF]/40 rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              title="Replay these signs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Replay</span>
            </button>
          )}
          <InfoTooltip content="ISL Gloss is a written notation system for International Sign Language representing grammar and sign sequence. Click 'Replay' to watch the avatar sign this gloss again." />
        </div>
      </div>
      <div className="bg-slate-50 dark:bg-[#000000] rounded-lg p-4 sm:p-6 border border-blue-200/50 dark:border-[#004AFF]/20 shadow-inner transition-colors duration-300 flex-1 min-h-0 overflow-auto">
        <p className="text-blue-800 dark:text-[#DDE3E7] font-mono text-sm leading-relaxed whitespace-pre-wrap font-medium transition-colors duration-300">
          {isl || (
            <span className="text-slate-500 dark:text-[#DDE3E7]/50 italic flex items-center space-x-3 font-sans transition-colors duration-300">
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
              <span>ISL gloss will appear here...</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
};

export default ISLGlossSection;