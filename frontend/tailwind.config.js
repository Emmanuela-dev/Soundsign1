/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      fontFamily: {
        inter: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif",
        ],
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        ping: "ping 1s cubic-bezier(0, 0, 0.2, 1) infinite",
        spin: "spin 1s linear infinite",
      },
      colors: {
        // Warm, light, human-centred design palette
        warm: {
          25: "#FDFCFB",
          50: "#FAF9F6",
          100: "#F5F3EF",
          200: "#EAE6DF",
          300: "#DCD6CB",
          400: "#B8B0A2",
          500: "#8E8678",
          600: "#696356",
          700: "#4D483E",
          800: "#322E27",
          900: "#1A1814",
        },
        // Speech & Hearing mode accent (calm, accessible teal)
        hearing: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
        },
        // Sign & Gesture mode accent (deep, accessible indigo)
        signing: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
        },
        // Institutional healthcare juniper/teal
        juniper: {
          50: "#F0FDF8",
          100: "#DCFCEE",
          200: "#BBF7DF",
          600: "#0E4A40",
          700: "#0B3C34",
          800: "#082E28",
          900: "#05201C",
        },
        // Refined dark mode neutrals (soft obsidian slate, avoiding harsh OLED glare)
        dark: {
          bg: "#0B0F17",
          surface: "#111827",
          card: "#161F30",
          border: "#1F293D",
          text: "#F1F5F9",
          muted: "#94A3B8",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
        elevated: "0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
};
