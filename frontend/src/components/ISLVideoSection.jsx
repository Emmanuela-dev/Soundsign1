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
    <div className="bg-white/80 dark:bg-[#000000] backdrop-blur-xl rounded-2xl
                    border border-white/30 dark:border-[#004AFF]/30 shadow-xl p-2
                    transition-colors duration-300 h-full flex flex-col">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 dark:bg-[#004AFF] rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-[#DDE3E7]">
            ISL Video Translation
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <WordDatabaseBrowser onSelectWord={onSelectWord} />
          <InfoTooltip content="Signs play automatically as you speak — one word at a time, in real time. You can also click words in the dictionary to sign them." />
        </div>
      </div>

      {/* Player */}
      <div className="flex-1 min-h-0 bg-slate-50 dark:bg-[#000000] rounded-xl p-2
                      border border-slate-200/50 dark:border-[#004AFF]/20 shadow-inner
                      transition-colors duration-300 flex items-stretch">
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
