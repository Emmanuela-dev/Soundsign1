import { useState } from "react";
import { WORD_DATABASE } from "./wordDatabase.js";

const WordDatabaseBrowser = ({ className = "", onSelectWord }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredWords = WORD_DATABASE.filter(word =>
    word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`}>
      <button
        className="px-2.5 py-1 bg-warm-100 hover:bg-warm-200 dark:bg-dark-card dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl border border-warm-200 dark:border-dark-border flex items-center gap-1.5 transition-colors text-xs font-semibold shadow-xs cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
        title="Browse sign dictionary"
      >
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>Dictionary</span>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 top-8 w-72 sm:w-80 max-w-[85vw] bg-white dark:bg-dark-surface rounded-2xl shadow-elevated border border-warm-200 dark:border-dark-border z-40 transition-colors"
        >
          {/* Header */}
          <div className="p-3 border-b border-warm-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-dark-text">
                Quick Sign Dictionary ({WORD_DATABASE.length})
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search vocabulary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-3 py-1.5 text-xs border border-warm-200 dark:border-dark-border bg-warm-50 dark:bg-dark-card text-slate-900 dark:text-dark-text placeholder-slate-400 rounded-xl focus:ring-2 focus:ring-signing-500 outline-none transition-colors"
              />
            </div>
          </div>
          
          {/* Words List */}
          <div className="max-h-48 sm:max-h-60 overflow-y-auto p-2">
            {filteredWords.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {filteredWords.map((word, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      if (onSelectWord) {
                        onSelectWord(word);
                      }
                      setIsOpen(false);
                    }}
                    className="px-2 py-1.5 text-xs text-left text-slate-700 dark:text-slate-200 hover:bg-hearing-50 dark:hover:bg-hearing-950/40 hover:text-hearing-700 dark:hover:text-hearing-300 rounded-lg transition-colors flex items-center justify-between group cursor-pointer"
                    title={`Click to play sign for "${word}"`}
                  >
                    <span className="truncate">{word}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-[10px] text-hearing-600 font-bold ml-1">▶</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No words matching "{searchTerm}"
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="p-2.5 border-t border-warm-200 dark:border-dark-border bg-warm-50 dark:bg-dark-card rounded-b-2xl">
            <p className="text-[11px] text-slate-500 dark:text-dark-muted text-center">
              Click any word to sign it instantly
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WordDatabaseBrowser;
