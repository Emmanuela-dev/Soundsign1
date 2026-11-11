export default function Transcript({ transcript }) {
  return (
      <p className="text-gray-700 dark:text-[#DDE3E7] whitespace-pre-wrap leading-relaxed">
        {transcript || (
          <span className="text-gray-400 dark:text-[#DDE3E7]/50 italic">
            Your speech will appear here...
          </span>
        )}
      </p>
  );
}
