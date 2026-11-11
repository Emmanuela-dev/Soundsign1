import React from "react";

/**
 * CameraFramingGuide
 * Provides subtle visual framing assistance for the user to position their
 * head, shoulders, and signing hands for optimal MediaPipe tracking accuracy.
 * Styled with soft, non-intrusive lines outside the active tracking center.
 */
export default function CameraFramingGuide({ isHandsDetected = false, showGuide = true }) {
  if (!showGuide) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col items-center justify-between p-4 sm:p-6 transition-opacity duration-300">
      {/* Top status indicator */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-sm border border-white/10 text-[11px] text-white/80 shadow-sm">
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            isHandsDetected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
          }`}
        />
        <span>
          {isHandsDetected
            ? "Signing Space Active — Hands Tracked"
            : "Frame head & shoulders inside guide"}
        </span>
      </div>

      {/* Center SVG Framing Silhouette (Upper torso & hand volume) */}
      <div className="w-full h-full max-w-lg max-h-[85%] flex items-center justify-center opacity-30">
        <svg
          viewBox="0 0 400 480"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Head guide ellipse */}
          <ellipse
            cx="200"
            cy="110"
            rx="55"
            ry="70"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="text-white"
          />

          {/* Shoulders & Upper Torso guide arc */}
          <path
            d="M 100 240 Q 140 190, 200 190 Q 260 190, 300 240 L 330 380 L 70 380 Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            className="text-white"
          />

          {/* Primary Signing Zone Boundary */}
          <rect
            x="60"
            y="180"
            width="280"
            height="240"
            rx="16"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 3"
            className={isHandsDetected ? "text-emerald-400" : "text-white/60"}
          />

          {/* Corner tick marks for signing zone */}
          <path d="M 50 200 L 50 180 L 70 180" stroke="currentColor" strokeWidth="2" className="text-white" />
          <path d="M 330 180 L 350 180 L 350 200" stroke="currentColor" strokeWidth="2" className="text-white" />
          <path d="M 50 400 L 50 420 L 70 420" stroke="currentColor" strokeWidth="2" className="text-white" />
          <path d="M 330 420 L 350 420 L 350 400" stroke="currentColor" strokeWidth="2" className="text-white" />
        </svg>
      </div>

      {/* Bottom hint */}
      <div className="text-[10px] text-white/50 tracking-wider uppercase font-medium">
        Natural signing volume · 1 or 2 hands
      </div>
    </div>
  );
}

