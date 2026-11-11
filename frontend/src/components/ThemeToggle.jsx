import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="group relative p-2.5 sm:p-3 rounded-xl bg-white/20 dark:bg-[#000000] backdrop-blur-lg border border-white/30 dark:border-[#004AFF]/30 hover:bg-white/30 dark:hover:bg-[#004AFF]/20 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5 sm:w-6 sm:h-6">
        {/* Sun Icon - shown in dark mode (natural warm golden/yellow) */}
        <svg
          className={`absolute inset-0 w-full h-full text-amber-400 transition-all duration-300 ${
            isDarkMode 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 rotate-90 scale-50'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="5" strokeWidth="2" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          />
        </svg>

        {/* Moon Icon - shown in light mode */}
        <svg
          className={`absolute inset-0 w-full h-full text-slate-700 dark:text-[#DDE3E7] transition-all duration-300 ${
            !isDarkMode 
              ? 'opacity-100 rotate-0 scale-100' 
              : 'opacity-0 -rotate-90 scale-50'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
          />
        </svg>
      </div>

      {/* Hover effect */}
      <div className="absolute inset-0 rounded-xl bg-blue-400/10 dark:bg-[#004AFF]/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
    </button>
  );
};

export default ThemeToggle;