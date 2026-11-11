export default function Microphone({ isRecording, toggleRecording }) {
  return (
    <div className="flex items-center gap-2">
      {/* Left - Click to record text */}
      <p className="text-gray-600 dark:text-[#DDE3E7] font-medium text-xs">
        {isRecording ? "Click to stop" : "Click to record"}
      </p>

      {/* Center - Microphone button */}
      <button
        onClick={toggleRecording}
        className={`p-2 rounded-full transition-all duration-300 ${
          isRecording
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : "bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] dark:hover:bg-blue-600"
        } text-white shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-[#004AFF]`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
        {isRecording && (
          <span className="absolute top-0 right-0 flex h-2 w-2">
            <span className="animate-ping absolute h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative h-2 w-2 rounded-full bg-red-600"></span>
          </span>
        )}
      </button>

      {/* Right - Speak clearly text */}
      <p className="text-xs text-gray-500 dark:text-[#DDE3E7]/70">
        {isRecording ? "Recording..." : "Speak clearly"}
      </p>
    </div>
  );
}