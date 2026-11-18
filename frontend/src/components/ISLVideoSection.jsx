import ISLVideoPlayer from "./ISLVideoPlayer";
import WordDatabaseBrowser from "./WordDatabaseBrowser";
import InfoTooltip from "./InfoTooltip";

const ISLVideoSection = ({
  signQueueRef,
  onSelectWord,
  transcript,
  isl,
  isRecording,
  toggleRecording,
  isProcessing,
  submitText,
}) => {
  return (
    <div className="bg-white/95 dark:bg-dark-surface rounded-2xl border border-warm-200 dark:border-dark-border shadow-card p-3 transition-colors duration-300 h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-hearing-600 rounded-xl flex items-center justify-center text-white shadow-xs flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-dark-text leading-tight">
              Sign Language Avatar Video
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-dark-muted">
              Real-time video demonstration for spoken words
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <WordDatabaseBrowser onSelectWord={onSelectWord} />
          <InfoTooltip content="Signs play automatically as you speak or type — one word at a time, in real time. Click any dictionary word to sign it instantly." />
        </div>
      </div>

      {/* Player Stage */}
      <div className="flex-1 min-h-0 bg-warm-50/70 dark:bg-dark-card rounded-xl p-2 border border-warm-200/60 dark:border-dark-border transition-colors duration-300 flex items-stretch">
        <ISLVideoPlayer
          signQueueRef={signQueueRef}
          transcript={transcript}
          isl={isl}
          isRecording={isRecording}
          toggleRecording={toggleRecording}
          isProcessing={isProcessing}
          submitText={submitText}
        />
      </div>
    </div>
  );
};

export default ISLVideoSection;

