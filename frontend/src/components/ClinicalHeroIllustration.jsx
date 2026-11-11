import React from 'react';

/**
 * Clean, human-centric SVG illustration representing doctor-patient communication
 * and accessible sign language translation. Built with Apple/Google Health minimalist styling.
 */
export default function ClinicalHeroIllustration({ className = 'w-full h-auto max-h-56' }) {
  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 640 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-w-xl drop-shadow-sm"
        aria-label="Clinician and Deaf patient communicating through accessible sign language translation"
      >
        <defs>
          <linearGradient id="softBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F1F5F9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#E2E8F0" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#0F766E" />
          </linearGradient>
          <linearGradient id="slateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>
          <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0D9488" stopOpacity="0.1" />
            <stop offset="50%" stopColor="#0D9488" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0D9488" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Ambient Backing Capsule */}
        <rect x="20" y="15" width="600" height="230" rx="28" fill="url(#softBg)" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

        {/* Left Side: Clinician (Speaking / Listening) */}
        <g transform="translate(60, 45)">
          {/* Head & Torso */}
          <circle cx="60" cy="40" r="24" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />
          {/* Subtle Stethoscope loop */}
          <path d="M 48 55 Q 60 75 72 55" stroke="#0D9488" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="60" cy="80" r="5" fill="#0D9488" />
          {/* Clinician Coat */}
          <path d="M 28 135 C 28 85 92 85 92 135" fill="white" stroke="#94A3B8" strokeWidth="2" />
          <path d="M 52 95 L 60 135 L 68 95" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* Speech Waves */}
          <path d="M 95 35 Q 110 40 95 48" stroke="#0D9488" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 103 28 Q 123 40 103 55" stroke="#0D9488" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
          
          {/* Clinician Label */}
          <text x="60" y="155" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600" letterSpacing="0.02em">
            Clinician (Speech)
          </text>
        </g>

        {/* Center: Bidirectional Bridge & Neural Hand Landmark Geometry */}
        <g transform="translate(230, 40)">
          {/* Connection Arc */}
          <path d="M 0 70 C 50 20 130 20 180 70" stroke="url(#accentLine)" strokeWidth="3" strokeDasharray="6 4" fill="none" />

          {/* Central Sign Language Landmark Node Cluster */}
          <circle cx="90" cy="55" r="42" fill="white" stroke="#0D9488" strokeWidth="2" />
          {/* Hand Palm & Finger Joint Graphic */}
          <path d="M 80 70 L 80 48 L 86 38 L 94 38 L 100 48 L 100 70 Z" fill="#CCFBF1" stroke="#0D9488" strokeWidth="1.5" />
          {/* Tracking Joint Dots */}
          <circle cx="86" cy="38" r="3" fill="#0D9488" />
          <circle cx="94" cy="38" r="3" fill="#0D9488" />
          <circle cx="90" cy="32" r="3" fill="#0D9488" />
          <circle cx="76" cy="50" r="3" fill="#0D9488" />
          <circle cx="104" cy="50" r="3" fill="#0D9488" />
          <circle cx="90" cy="62" r="3.5" fill="#0F766E" />

          {/* Mutual Understanding Badge */}
          <rect x="42" y="110" width="96" height="24" rx="12" fill="#0D9488" />
          <text x="90" y="126" textAnchor="middle" fill="white" fontSize="11" fontWeight="600" letterSpacing="0.03em">
            Zero-Delay Bridge
          </text>
        </g>

        {/* Right Side: Deaf Patient (Signing / Expressing) */}
        <g transform="translate(460, 45)">
          {/* Head & Torso */}
          <circle cx="60" cy="40" r="24" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="2" />
          {/* Clothing */}
          <path d="M 28 135 C 28 85 92 85 92 135" fill="#334155" stroke="#1E293B" strokeWidth="2" />

          {/* Raised Expressive Hands */}
          <path d="M 20 95 C 15 75 25 65 32 75 L 35 95" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 100 95 C 105 75 95 65 88 75 L 85 95" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* Patient Label */}
          <text x="60" y="155" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600" letterSpacing="0.02em">
            Patient (Sign & Touch)
          </text>
        </g>
      </svg>
    </div>
  );
}

