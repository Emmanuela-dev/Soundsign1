import React from "react";
import { Mic, Hand, ArrowRight, ShieldCheck } from "lucide-react";

/**
 * LandingPage
 * Exceptionally minimal, respectful, and clear first impression for SoundSign1.
 * Contains only:
 * 1. Brand name & wordmark
 * 2. One authentic, high-quality photograph communicating human care & sign communication
 * 3. Two prominent, beautifully designed primary role buttons:
 *    - "I am speaking" (Clinician)
 *    - "I am signing" (Deaf user)
 */
export default function LandingPage({ onSelectRole }) {
  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] dark:bg-dark-bg text-slate-900 dark:text-dark-text flex flex-col justify-between p-4 sm:p-6 lg:p-10 select-none">
      {/* Top Wordmark */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between pt-2 sm:pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-juniper-600 text-white flex items-center justify-center shadow-xs">
            <Hand size={20} className="stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              SoundSign<span className="text-juniper-600 dark:text-teal-400">1</span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium tracking-wide">
              Healthcare Communication Bridge
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-dark-card border border-stone-200 dark:border-dark-border text-xs text-stone-600 dark:text-stone-300 font-medium">
          <ShieldCheck size={14} className="text-juniper-600 dark:text-teal-400" />
          <span>Hospital Ready · Private</span>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="w-full max-w-4xl mx-auto my-auto py-6 sm:py-8 flex flex-col items-center">
        {/* Authentic Photograph Frame */}
        <div className="w-full aspect-[16/9] sm:aspect-[21/9] max-h-[380px] rounded-3xl overflow-hidden shadow-card border border-stone-200/80 dark:border-dark-border relative bg-stone-100 dark:bg-dark-card mb-8">
          <img
            src="/images/hero-communication.jpg"
            alt="Clinician and Deaf individual communicating with empathy and sign language"
            className="w-full h-full object-cover object-center filter brightness-[0.98] contrast-[1.02]"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-4 sm:bottom-4 sm:left-6 text-white text-xs sm:text-sm font-medium drop-shadow-sm">
            Empathetic, barrier-free communication at the point of care.
          </div>
        </div>

        {/* Action Prompt */}
        <p className="text-sm sm:text-base font-semibold text-stone-600 dark:text-stone-300 mb-5 text-center">
          Select your role to start communicating immediately:
        </p>

        {/* The Two Primary Action Buttons */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Option 1: Clinician (Speaking) */}
          <button
            type="button"
            onClick={() => onSelectRole("clinician")}
            className="group relative flex items-start gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-dark-card border-2 border-stone-200 dark:border-dark-border hover:border-juniper-600 dark:hover:border-teal-500 hover:shadow-elevated transition-all duration-200 cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="w-14 h-14 rounded-2xl bg-juniper-50 dark:bg-teal-950/60 border border-juniper-200/60 dark:border-teal-800 text-juniper-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 group-hover:bg-juniper-600 group-hover:text-white transition-colors duration-200 shadow-xs">
              <Mic size={26} className="stroke-[2.2]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  I am speaking
                </span>
                <ArrowRight
                  size={18}
                  className="text-stone-400 group-hover:text-juniper-600 dark:group-hover:text-teal-400 group-hover:translate-x-1 transition-all"
                />
              </div>
              <span className="inline-block mt-0.5 text-xs font-semibold text-juniper-700 dark:text-teal-400 uppercase tracking-wider">
                Clinician
              </span>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Your speech translates in real-time to sign language video for the patient.
              </p>
            </div>
          </button>

          {/* Option 2: Deaf User (Signing) */}
          <button
            type="button"
            onClick={() => onSelectRole("patient")}
            className="group relative flex items-start gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-dark-card border-2 border-stone-200 dark:border-dark-border hover:border-sky-600 dark:hover:border-sky-400 hover:shadow-elevated transition-all duration-200 cursor-pointer text-left active:scale-[0.99]"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-colors duration-200 shadow-xs">
              <Hand size={26} className="stroke-[2.2]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  I am signing
                </span>
                <ArrowRight
                  size={18}
                  className="text-stone-400 group-hover:text-sky-600 dark:group-hover:text-sky-400 group-hover:translate-x-1 transition-all"
                />
              </div>
              <span className="inline-block mt-0.5 text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                Deaf User
              </span>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 leading-snug">
                Your signs and one-touch symptoms speak aloud to the clinician.
              </p>
            </div>
          </button>
        </div>
      </main>

      {/* Subtle Footer */}
      <footer className="w-full max-w-4xl mx-auto pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 dark:text-stone-500 border-t border-stone-200/60 dark:border-dark-border gap-2">
        <span>Verified ISL & ASL Reference Vocabulary</span>
        <span>WCAG 2.2 Accessible · Instant Speech-to-Sign & Sign-to-Speech</span>
      </footer>
    </div>
  );
}

