import React, { useState, useRef, useEffect, useCallback } from "react";
import { speakText, EMOTION_PROFILES } from "./ttsUtils";
import {
  BUILTIN_GESTURES,
  classifyHandGesture,
  drawHandTracking,
  clearSmoothedLandmarks,
  trainGestureFromLandmarks,
} from "./gestureClassifier";
import ISLSignVideoTranslator, {
  POPULAR_SIGNS,
  NUMBER_SIGNS,
  LETTER_SIGNS,
  ALL_WORD_SIGNS,
} from "./ISLSignVideoTranslator";
import { HandMotionTracker } from "./motionTracker";
import { getCachedSrc } from "../hooks/useVideoPreloader";

const POPULAR_EMOJIS = [
  "✨", "💧", "🩺", "🍎", "🏠", "💡", "✋", "🤟", "🤝", "❤️", "⚡", "☕", "🚻", "🚗", "🙏", "🫶"
];

/**
 * Dynamically loads MediaPipe Hands library from CDN if not already present
 */
const loadMediaPipe = async () => {
  if (window.Hands) return window.Hands;

  const appendScript = (src) =>
    new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.Hands) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", (e) => reject(e));
        setTimeout(() => resolve(), 500);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });

  try {
    await appendScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
    await appendScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
  } catch (err) {
    console.warn("Failed to append MediaPipe scripts:", err);
  }

  for (let i = 0; i < 40; i++) {
    if (window.Hands) return window.Hands;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (window.Hands) return window.Hands;
  throw new Error("MediaPipe Hands script load timeout");
};

export default function GestureTerminal({ onSendMessage, isFullFocus = false }) {
  // Top view mode: "interpreter" (Camera View) | "gallery" (Dedicated Gesture Gallery)
  const [viewMode, setViewMode] = useState("interpreter");

  // Gallery Search & Category Filter
  const [gallerySearch, setGallerySearch] = useState("");
  const [galleryCategory, setGalleryCategory] = useState("all");

  const [responseText, setResponseText] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentGesture, setCurrentGesture] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceEmotion, setVoiceEmotion] = useState("soft");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingWord, setSpeakingWord] = useState("");
  const [aiStatus, setAiStatus] = useState("idle");
  const [handsDetectedCount, setHandsDetectedCount] = useState(0);

  // ISL Video Translation & In-Camera Reference Video States
  const [targetVideoSign, setTargetVideoSign] = useState(POPULAR_SIGNS[0]);
  const [showCamRefVideo, setShowCamRefVideo] = useState(false);
  const [camRefSign, setCamRefSign] = useState(POPULAR_SIGNS[0]);

  // Video Signing Range & Viewport Modes ("wide" = comfortable spacious signing stage, "cinema" = maximum full-height signing space)
  const [videoRangeMode, setVideoRangeMode] = useState("wide");
  const [isQuickDrawerOpen, setIsQuickDrawerOpen] = useState(false);

  // User-Trained Custom Gestures (strictly purges any legacy namaste)
  const [customGestures, setCustomGestures] = useState(() => {
    try {
      const saved = localStorage.getItem("soundSigns_custom_gestures");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter(
            (g) =>
              !g.name?.toLowerCase().includes("namaste") &&
              !g.word?.toLowerCase().includes("namaste") &&
              !g.id?.toLowerCase().includes("namaste")
          )
        : [];
    } catch {
      return [];
    }
  });

  // Training Studio Modal State
  const [isTrainingModalOpen, setIsTrainingModalOpen] = useState(false);
  const [trainingName, setTrainingName] = useState("");
  const [trainingWord, setTrainingWord] = useState("");
  const [trainingIcon, setTrainingIcon] = useState("✨");
  const [trainingCountdown, setTrainingCountdown] = useState(null);
  const [trainingStatusMessage, setTrainingStatusMessage] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const handsInstanceRef = useRef(null);
  const isProcessingFrameRef = useRef(false);

  // Smooth Transition & Stability Refs
  const currentGestureRef = useRef(null);
  const activeGestureTimeoutRef = useRef(null);
  const lastInterpretedGestureIdRef = useRef(null);
  const interSignCooldownRef = useRef(0);
  const graceFramesRef = useRef(0);
  const gestureHoldCounterRef = useRef({ id: null, count: 0, gesture: null });
  const lastSpokenGestureRef = useRef({ id: null, timestamp: 0 });
  const isCapturingTrainingRef = useRef(false);
  const trainingFramesRef = useRef([]);
  const motionTrackerRef = useRef(new HandMotionTracker());

  // Persist trained custom gestures to local storage (sanitized)
  useEffect(() => {
    try {
      const sanitized = customGestures.filter(
        (g) =>
          !g.name?.toLowerCase().includes("namaste") &&
          !g.word?.toLowerCase().includes("namaste") &&
          !g.id?.toLowerCase().includes("namaste")
      );
      localStorage.setItem("soundSigns_custom_gestures", JSON.stringify(sanitized));
    } catch (e) {
      console.warn("Could not save custom gestures:", e);
    }
  }, [customGestures]);

  // ── Interpret a Sign (from real camera detection or gallery click) ──────
  const interpretSign = useCallback(
    (gesture) => {
      // Clear any pending dismissal timeout from previous signs
      if (activeGestureTimeoutRef.current) {
        clearTimeout(activeGestureTimeoutRef.current);
        activeGestureTimeoutRef.current = null;
      }

      currentGestureRef.current = gesture;
      setCurrentGesture(gesture);
      lastInterpretedGestureIdRef.current = gesture.id;
      interSignCooldownRef.current = Date.now();

      // Sync reference video sign if available
      const gWord = (gesture.word || gesture.name || "").toLowerCase();
      const matchedVideo =
        POPULAR_SIGNS.find((s) => s.word.toLowerCase() === gWord) ||
        ALL_WORD_SIGNS.find((s) => s.word.toLowerCase() === gWord) ||
        NUMBER_SIGNS.find((s) => s.word.toLowerCase() === gWord || s.number === gesture.id?.replace("num_", "")) ||
        LETTER_SIGNS.find((s) => s.word.toLowerCase() === gWord || s.letter.toLowerCase() === gesture.id?.replace("letter_", "").toLowerCase());
      if (matchedVideo) {
        setCamRefSign(matchedVideo);
      }

      const phrase = gesture.word || gesture.name;
      const spokenPhrase = autoSpeak ? speakText(phrase, voiceEmotion) || phrase : phrase;

      setSpeakingWord(spokenPhrase);
      setIsSpeaking(true);

      if (onSendMessage) {
        onSendMessage({
          sender: "gesture",
          text: spokenPhrase,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }

      setResponseText((prev) => (prev ? `${prev} ${phrase}` : phrase));

      setTimeout(() => {
        setIsSpeaking(false);
      }, 2000);

      activeGestureTimeoutRef.current = setTimeout(() => {
        currentGestureRef.current = null;
        setCurrentGesture(null);
        setSpeakingWord("");
        activeGestureTimeoutRef.current = null;
      }, 3000);
    },
    [autoSpeak, onSendMessage, voiceEmotion]
  );

  // ── Real MediaPipe Hand Results Callback (Both Hands Supported) ─────────
  const onHandResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const w = canvas.offsetWidth || videoRef.current?.videoWidth || 640;
      const h = canvas.offsetHeight || videoRef.current?.videoHeight || 480;
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      const multiLandmarks = results.multiHandLandmarks || [];
      const numHands = multiLandmarks.length;
      setHandsDetectedCount(numHands);

      if (numHands > 0) {
        // Feed primary active hand landmarks to temporal motion tracker
        if (multiLandmarks[0]) {
          motionTrackerRef.current.addFrame(multiLandmarks[0]);
        }
        const motionFeatures = motionTrackerRef.current.getMotionFeatures();

        // Sample landmark frames if user is actively training a sign
        if (isCapturingTrainingRef.current && multiLandmarks[0]) {
          trainingFramesRef.current.push(multiLandmarks[0]);
        }

        // Run multi-hand classification (handles dynamic motion, two-handed, and single-hand signs)
        const recognized = classifyHandGesture(multiLandmarks, customGestures, motionFeatures);

        setAiStatus("hand_detected");

        const now = Date.now();
        const timeSinceLastInterpretation = now - interSignCooldownRef.current;

        if (recognized) {
          // Reset grace frames hysteresis counter
          graceFramesRef.current = 0;

          // Check if newly detected gesture matches active candidate
          if (gestureHoldCounterRef.current.id === recognized.id) {
            gestureHoldCounterRef.current.count += 1;
            gestureHoldCounterRef.current.gesture = recognized;
          } else {
            // New candidate gesture initiated
            gestureHoldCounterRef.current = {
              id: recognized.id,
              count: 1,
              gesture: recognized,
            };
          }

          // Smooth display update:
          // If the candidate has been steady for at least 2 frames (or is dynamic motion), update badge.
          // This prevents fleeting 1-frame transitional hand shapes from flashing on screen.
          if (gestureHoldCounterRef.current.count >= (recognized.isDynamicMotion ? 1 : 2)) {
            currentGestureRef.current = recognized;
            setCurrentGesture(recognized);
          }

          // Determine stability threshold required to finalize / speak the sign:
          // 1. Dynamic motion gesture: already verified over temporal sliding window
          // 2. Switching to a DIFFERENT sign: requires 5 consecutive stable frames (~160ms) to ensure transition settles
          // 3. Repeating the same sign or starting fresh: 4 frames
          const isSwitchingSign =
            lastInterpretedGestureIdRef.current &&
            lastInterpretedGestureIdRef.current !== recognized.id;
          const requiredFrames = recognized.isDynamicMotion ? 1 : isSwitchingSign ? 5 : 4;

          // Minimum inter-sign cooldown:
          // When switching to a different sign, require at least 700ms since the previous sign interpretation.
          // For repeating the EXACT same sign, require 2200ms to avoid machine-gun repetitions.
          const isRepeatOfSameSign = lastSpokenGestureRef.current.id === recognized.id;
          const isCooldownPassed = isRepeatOfSameSign
            ? now - lastSpokenGestureRef.current.timestamp > 2200
            : timeSinceLastInterpretation > 700;

          if (gestureHoldCounterRef.current.count >= requiredFrames && isCooldownPassed) {
            lastSpokenGestureRef.current = { id: recognized.id, timestamp: now };
            interpretSign(recognized);

            if (recognized.isDynamicMotion) {
              motionTrackerRef.current.softReset();
            }
          }
        } else {
          // No recognized gesture this frame (hand transitioning between signs or minor frame blur)
          graceFramesRef.current += 1;

          // Smooth hysteresis grace window (up to 4 frames ~130ms):
          // Absorbs intermediate hand shifts without instantly wiping the recognition badge or resetting
          if (graceFramesRef.current > 4) {
            gestureHoldCounterRef.current = { id: null, count: 0, gesture: null };
            if (!activeGestureTimeoutRef.current) {
              currentGestureRef.current = null;
              setCurrentGesture(null);
            }
          }
        }

        // Draw skeleton with smooth lerp tracking, trajectory trail & bounding box
        drawHandTracking(
          ctx,
          multiLandmarks,
          w,
          h,
          recognized || currentGestureRef.current,
          motionFeatures
        );
      } else {
        // No hands in frame
        graceFramesRef.current += 1;
        if (graceFramesRef.current > 4) {
          motionTrackerRef.current.reset();
          clearSmoothedLandmarks();
          ctx.clearRect(0, 0, w, h);
          setAiStatus("ready");
          if (!activeGestureTimeoutRef.current) {
            currentGestureRef.current = null;
            setCurrentGesture(null);
          }
          gestureHoldCounterRef.current = { id: null, count: 0, gesture: null };
        }
      }
    },
    [customGestures, interpretSign]
  );

  // ── Initialize MediaPipe with BOTH HANDS (maxNumHands: 2) ───────────────
  const startHandTracking = useCallback(async () => {
    try {
      setAiStatus("loading");
      await loadMediaPipe();

      if (!handsInstanceRef.current && window.Hands) {
        const hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        // Track up to 2 hands simultaneously with improved recall for angles and multi-hand poses
        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.35,
          minTrackingConfidence: 0.35,
        });

        hands.onResults(onHandResults);
        handsInstanceRef.current = hands;
      }

      setAiStatus("ready");

      // Frame Processing Loop
      const processLoop = async () => {
        if (
          streamRef.current &&
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          handsInstanceRef.current
        ) {
          if (!isProcessingFrameRef.current) {
            isProcessingFrameRef.current = true;
            try {
              await handsInstanceRef.current.send({ image: videoRef.current });
            } catch (err) {
              console.warn("MediaPipe frame send error:", err);
            } finally {
              isProcessingFrameRef.current = false;
            }
          }
        }
        animFrameRef.current = requestAnimationFrame(processLoop);
      };

      animFrameRef.current = requestAnimationFrame(processLoop);
    } catch (err) {
      console.error("AI hand tracking initialization error:", err);
      setAiStatus("error");
    }
  }, [onHandResults]);

  // ── Camera Management ──────────────────────────────────────────────────
  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        "Camera is not supported on this browser or requires a secure context (HTTPS / localhost)."
      );
      return;
    }

    try {
      let stream;
      try {
        // High-definition wide-angle 16:9 stream to maximize comfortable signing range
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 1.7777777778 },
            facingMode: "user",
          },
          audio: false,
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: false,
          });
        } catch (err2) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((e) => console.warn("Video play error:", e));
        };
        videoRef.current.play().catch((e) => console.warn("Video play error:", e));
      }

      startHandTracking();
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser address bar or settings."
          : `Camera unavailable (${err.name || "error"}). Please ensure no other application is using your camera.`
      );
      setIsCameraActive(false);
      setAiStatus("idle");
    }
  };

  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch((err) => {
        console.warn("Video play failed:", err);
      });
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (activeGestureTimeoutRef.current) {
      clearTimeout(activeGestureTimeoutRef.current);
      activeGestureTimeoutRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    clearSmoothedLandmarks();
    setIsCameraActive(false);
    setAiStatus("idle");
    currentGestureRef.current = null;
    setCurrentGesture(null);
    setHandsDetectedCount(0);
    gestureHoldCounterRef.current = { id: null, count: 0, gesture: null };
    graceFramesRef.current = 0;
    motionTrackerRef.current?.reset();
  };

  useEffect(() => {
    if (!isCameraActive && !cameraError && viewMode === "interpreter") {
      startCamera();
    }
  }, [viewMode]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // ── Training Custom Gesture Workflow ──────────────────────────────────
  const handleOpenTraining = () => {
    setTrainingName("");
    setTrainingWord("");
    setTrainingIcon("✨");
    setTrainingCountdown(null);
    setTrainingStatusMessage("");
    setIsTrainingModalOpen(true);

    if (!isCameraActive) {
      startCamera();
    }
  };

  const handleStartCaptureTraining = () => {
    if (!trainingName.trim()) {
      setTrainingStatusMessage("Please name your gesture (e.g. 'Water', 'Hungry', 'Doctor').");
      return;
    }

    setTrainingStatusMessage("Hold your sign steady in front of camera...");
    setTrainingCountdown(3);

    let current = 3;
    const timer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setTrainingCountdown(current);
      } else if (current === 0) {
        setTrainingCountdown("Capturing Pose...");
        trainingFramesRef.current = [];
        isCapturingTrainingRef.current = true;

        setTimeout(() => {
          isCapturingTrainingRef.current = false;
          clearInterval(timer);
          setTrainingCountdown(null);

          const captured = trainingFramesRef.current;
          if (captured.length < 5) {
            setTrainingStatusMessage(
              "No steady hand detected during capture. Please hold your hand clearly in front of the camera and try again."
            );
            return;
          }

          const newGesture = trainGestureFromLandmarks(
            trainingName.trim(),
            trainingWord.trim() || trainingName.trim(),
            trainingIcon,
            captured
          );

          if (newGesture) {
            setCustomGestures((prev) => [newGesture, ...prev]);
            setTrainingStatusMessage(`✅ Gesture "${newGesture.name}" trained successfully! Camera will now interpret it.`);
            setTimeout(() => {
              setIsTrainingModalOpen(false);
            }, 1600);
          } else {
            setTrainingStatusMessage("Could not extract clean feature vector. Please try again with clear hand view.");
          }
        }, 1600);
      }
    }, 1000);
  };

  const handleDeleteCustomGesture = (id, e) => {
    e.stopPropagation();
    setCustomGestures((prev) => prev.filter((g) => g.id !== id));
  };

  // Practice a specific gesture from the gallery in camera view
  const handlePracticeInCamera = (gesture) => {
    setViewMode("interpreter");
    currentGestureRef.current = gesture;
    setCurrentGesture(gesture);
    // Also point the in-camera reference video to this sign
    const gWord = (gesture.word || gesture.name || "").toLowerCase();
    const matched =
      POPULAR_SIGNS.find((s) => s.word.toLowerCase() === gWord) ||
      ALL_WORD_SIGNS.find((s) => s.word.toLowerCase() === gWord);
    if (matched) {
      setCamRefSign(matched);
      setShowCamRefVideo(true);
    }
    if (!isCameraActive) {
      startCamera();
    }
  };

  // Watch HD ISL video for a specific gesture and translate to voice
  const handleWatchVideo = (gesture) => {
    let matched = null;
    const name = (gesture.word || gesture.name || "").toLowerCase();

    // Check popular signs
    matched = POPULAR_SIGNS.find((s) => s.word.toLowerCase() === name);

    // Check numbers
    if (!matched) {
      matched = NUMBER_SIGNS.find(
        (s) => s.word.toLowerCase() === name || s.number === gesture.id?.replace("num_", "")
      );
    }

    // Check letters
    if (!matched) {
      matched = LETTER_SIGNS.find(
        (s) =>
          s.word.toLowerCase() === name ||
          s.letter.toLowerCase() === gesture.id?.replace("letter_", "").toLowerCase()
      );
    }

    // Check all words
    if (!matched) {
      matched = ALL_WORD_SIGNS.find((s) => s.word.toLowerCase() === name);
    }

    const signToPlay = matched || {
      word: gesture.word || gesture.name,
      icon: gesture.icon || "🤟",
      category: "Gestures",
      path: `/videos/words/Hello.mp4`,
      description: gesture.description || gesture.name,
    };

    setTargetVideoSign(signToPlay);
    setCamRefSign(signToPlay);
    setViewMode("video");
  };

  // Speak sentence
  const handleSpeakResponse = () => {
    const textToSpeak = responseText.trim();
    if (!textToSpeak) return;

    const spokenPhrase = speakText(textToSpeak, voiceEmotion) || textToSpeak;
    setIsSpeaking(true);
    setSpeakingWord(spokenPhrase);

    if (onSendMessage) {
      onSendMessage({
        sender: "gesture",
        text: spokenPhrase,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
    }

    setTimeout(() => {
      setIsSpeaking(false);
      setSpeakingWord("");
      setResponseText("");
    }, 2000);
  };

  const handleTestVoice = () => {
    const sample = "Hello! Wonderful to see you.";
    speakText(sample, voiceEmotion);
    setSpeakingWord(sample);
    setIsSpeaking(true);
    setTimeout(() => {
      setIsSpeaking(false);
      setSpeakingWord("");
    }, 2000);
  };

  // Full merged gesture list (strictly excludes any namaste entries)
  const allGesturesList = [...customGestures, ...BUILTIN_GESTURES].filter(
    (g) =>
      !g.name?.toLowerCase().includes("namaste") &&
      !g.word?.toLowerCase().includes("namaste") &&
      !g.id?.toLowerCase().includes("namaste")
  );

  // Filtered gestures for Gallery view
  const filteredGalleryGestures = allGesturesList.filter((g) => {
    const matchesCategory =
      galleryCategory === "all" ||
      (galleryCategory === "single_hand" && g.singleHandOnly) ||
      (galleryCategory === "two_handed" && g.isTwoHanded) ||
      (galleryCategory === "basics" && g.category === "basics" && !g.isTwoHanded) ||
      (galleryCategory === "numbers" && g.category === "numbers") ||
      (galleryCategory === "letters" && g.category === "letters") ||
      (galleryCategory === "custom" && g.isCustom);

    const q = gallerySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.word.toLowerCase().includes(q) ||
      (g.description && g.description.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white/85 dark:bg-[#000000] backdrop-blur-xl rounded-2xl border border-white/30 dark:border-[#004AFF]/30 shadow-xl p-3 sm:p-4 flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-300">
      {/* ── Header: Title, Mode Toggles (Live Camera vs Gallery) & Controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-[#004AFF] flex items-center justify-center text-white shadow-lg">
            <span className="emoji text-lg select-none">🤟</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-blue-700 dark:text-[#DDE3E7] flex items-center gap-2">
                <span>Sign Language Camera Interpreter</span>
                {isCameraActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#004AFF] animate-pulse" />
                )}
              </h3>

              {/* View Switcher: Live Camera vs Video Signs vs Dedicated Gallery */}
              <div className="flex items-center bg-slate-100 dark:bg-[#000000] p-0.5 rounded-lg border border-slate-200 dark:border-[#004AFF]/30 text-xs">
                <button
                  onClick={() => setViewMode("interpreter")}
                  className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "interpreter"
                      ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-blue-600 dark:hover:text-[#004AFF]"
                  }`}
                  title="Live Optical Vision Camera Interpreter"
                >
                  <span className="emoji">📹</span>
                  <span>Camera Mode</span>
                </button>
                <button
                  onClick={() => setViewMode("video")}
                  className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "video"
                      ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-blue-600 dark:hover:text-[#004AFF]"
                  }`}
                  title="High-Clarity ISL Video Translator (Sign → Voice) with zero camera errors"
                >
                  <span className="emoji">🎬</span>
                  <span>Video Signs (Sign → Voice)</span>
                </button>
                <button
                  onClick={() => setViewMode("gallery")}
                  className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "gallery"
                      ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-blue-600 dark:hover:text-[#004AFF]"
                  }`}
                  title="Browse full Gesture Gallery catalog"
                >
                  <span className="emoji">📚</span>
                  <span>Gallery ({allGesturesList.length})</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-[#DDE3E7]/70">
              Dual Optical AR & Ground-Truth ISL Video Interpreter · Real-time Voice Synthesis
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Reference Video Guide in Camera Mode */}
          {viewMode === "interpreter" && (
            <button
              onClick={() => setShowCamRefVideo(!showCamRefVideo)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                showCamRefVideo
                  ? "bg-emerald-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] ring-2 ring-emerald-400 dark:ring-[#004AFF]"
                  : "bg-blue-100 dark:bg-[#004AFF]/20 text-blue-800 dark:text-[#DDE3E7] border border-blue-200 dark:border-[#004AFF]/40 hover:bg-blue-200 dark:hover:bg-[#004AFF]/30"
              }`}
              title="Toggle high-clarity reference ISL video guide next to camera"
            >
              <span className="emoji">🎬</span>
              <span>{showCamRefVideo ? "Hide Video Guide" : "Sign Video Guide"}</span>
            </button>
          )}

          {/* Video Signing Range Toggle (Spacious Wide Range vs Max Cinema Stage) */}
          {viewMode === "interpreter" && (
            <button
              onClick={() => setVideoRangeMode(videoRangeMode === "wide" ? "cinema" : "wide")}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                videoRangeMode === "cinema"
                  ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] ring-2 ring-blue-400"
                  : "bg-slate-100 dark:bg-[#004AFF]/20 text-slate-700 dark:text-[#DDE3E7] border border-slate-300 dark:border-[#004AFF]/40 hover:bg-slate-200 dark:hover:bg-[#004AFF]/30"
              }`}
              title={videoRangeMode === "cinema" ? "Switch to standard comfortable range" : "Maximize video range to full height for comfortable signing"}
            >
              <span className="emoji">{videoRangeMode === "cinema" ? "🗗" : "⛶"}</span>
              <span>{videoRangeMode === "cinema" ? "Standard Range" : "Maximize Range"}</span>
            </button>
          )}

          {/* ➕ Train Sign Button */}
          <button
            onClick={handleOpenTraining}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all hover:scale-102"
            title="Train camera to learn any new custom hand gesture"
          >
            <span className="text-sm leading-none">➕</span>
            <span>Train Sign</span>
          </button>

          {/* Emotion Profile Selector */}
          <div className="flex items-center bg-slate-100 dark:bg-[#000000] p-0.5 rounded-xl border border-slate-200 dark:border-[#004AFF]/30 text-xs">
            {Object.values(EMOTION_PROFILES).map((em) => (
              <button
                key={em.id}
                onClick={() => setVoiceEmotion(em.id)}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                  voiceEmotion === em.id
                    ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-xs"
                    : "text-slate-600 dark:text-[#DDE3E7]/70 hover:text-blue-600 dark:hover:text-[#004AFF]"
                }`}
                title={em.description}
              >
                {em.shortLabel}
              </button>
            ))}
          </div>

          {/* Test Voice Button */}
          <button
            onClick={handleTestVoice}
            className="px-2.5 py-1 bg-blue-100 dark:bg-[#004AFF]/20 hover:bg-blue-200 dark:hover:bg-[#004AFF]/30 text-blue-800 dark:text-[#DDE3E7] border border-transparent dark:border-[#004AFF]/40 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
            title="Preview how soft human voice sounds"
          >
            <span className="emoji">🔊</span>
            <span>Test Voice</span>
          </button>

          {/* Auto-Speak Checkbox */}
          <label className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#DDE3E7]/80 cursor-pointer select-none bg-blue-50 dark:bg-[#000000] px-2 py-1 rounded-lg border border-blue-200 dark:border-[#004AFF]/30">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="rounded text-blue-600 dark:text-[#004AFF] focus:ring-blue-500 dark:focus:ring-[#004AFF] cursor-pointer"
            />
            <span className="font-semibold text-blue-700 dark:text-[#DDE3E7]">
              Live Voice
            </span>
          </label>

          {/* Camera Button */}
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isCameraActive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{isCameraActive ? "Stop Camera" : "Turn Camera On"}</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <span className="emoji">⚠️</span>
          <span>{cameraError}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────── */}
      {/* VIEW A: DEDICATED GESTURE GALLERY                                  */}
      {/* ───────────────────────────────────────────────────────────────── */}
      {viewMode === "gallery" ? (
        <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-[#000000] rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-[#004AFF]/30 overflow-hidden">
          {/* Gallery Top Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-3 pb-2 border-b border-slate-200 dark:border-[#004AFF]/25 flex-shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              <input
                type="text"
                value={gallerySearch}
                onChange={(e) => setGallerySearch(e.target.value)}
                placeholder="Search gestures by name or meaning (e.g. hello, peace, numbers, letters)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#000000] border border-slate-300 dark:border-[#004AFF]/40 rounded-xl text-slate-800 dark:text-[#DDE3E7] placeholder-slate-400 dark:placeholder-[#DDE3E7]/40 focus:outline-none focus:ring-2 focus:ring-[#004AFF]"
              />
              {gallerySearch && (
                <button
                  onClick={() => setGallerySearch("")}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {[
                { id: "all", label: `All (${allGesturesList.length})` },
                { id: "single_hand", label: `🖐️ 1 Hand Only (${allGesturesList.filter((g) => g.singleHandOnly).length})` },
                { id: "two_handed", label: `👐 Two-Handed (${allGesturesList.filter((g) => g.isTwoHanded).length})` },
                { id: "basics", label: "Expressions" },
                { id: "numbers", label: "Numbers 0-9" },
                { id: "letters", label: "Alphabet" },
                { id: "custom", label: `⭐ Trained (${customGestures.length})` },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setGalleryCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    galleryCategory === cat.id
                      ? "bg-blue-600 text-white dark:bg-[#004AFF] dark:text-[#DDE3E7] shadow-xs"
                      : "text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-slate-200 dark:hover:bg-[#004AFF]/20"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contextual Guidance Banner for Hand Requirements */}
          {galleryCategory === "single_hand" && (
            <div className="mb-2.5 p-2 rounded-xl bg-blue-50 dark:bg-[#000000] border border-blue-200 dark:border-[#004AFF]/40 text-xs text-blue-900 dark:text-[#DDE3E7] flex items-center gap-2">
              <span className="emoji text-base">🖐️</span>
              <span><strong>Single-Hand Signs:</strong> Must be performed with 1 hand only. If two hands are active in frame, recognition is suppressed to prevent misinterpretation.</span>
            </div>
          )}
          {galleryCategory === "two_handed" && (
            <div className="mb-2.5 p-2 rounded-xl bg-emerald-50 dark:bg-[#000000] border border-emerald-300 dark:border-[#004AFF]/40 text-xs text-emerald-900 dark:text-[#DDE3E7] flex items-center gap-2">
              <span className="emoji text-base">👐</span>
              <span><strong>Two-Handed Signs:</strong> These gestures specifically require both hands held up simultaneously in camera (Heart 🫶, Double Thumbs Up 👍👍, Clap 👏, Welcome 🤗).</span>
            </div>
          )}

          {/* Gallery Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 pr-1">
            {filteredGalleryGestures.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
                <span className="text-3xl mb-2">🔍</span>
                <p className="text-sm font-bold text-slate-800 dark:text-[#DDE3E7] mb-1">
                  No gestures matched "{gallerySearch}"
                </p>
                <p className="text-xs text-slate-500 dark:text-[#DDE3E7]/60 mb-3">
                  Try another search query or train your own custom sign.
                </p>
                <button
                  onClick={handleOpenTraining}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  ➕ Train New Gesture
                </button>
              </div>
            ) : (
              filteredGalleryGestures.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white dark:bg-[#000000] border border-slate-200 dark:border-[#004AFF]/30 rounded-xl shadow-xs flex flex-col justify-between hover:border-blue-400 dark:hover:border-[#004AFF] transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="emoji text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                      <div className="flex items-center gap-1">
                        {item.singleHandOnly && (
                          <span className="text-[9px] bg-blue-100 dark:bg-[#004AFF]/20 text-blue-800 dark:text-[#DDE3E7] px-1.5 py-0.5 rounded font-bold uppercase">
                            🖐️ 1 Hand
                          </span>
                        )}
                        {item.isTwoHanded && (
                          <span className="text-[9px] bg-emerald-100 dark:bg-[#004AFF]/20 text-emerald-800 dark:text-[#DDE3E7] px-1.5 py-0.5 rounded font-bold uppercase">
                            👐 2 Hands
                          </span>
                        )}
                        {item.isCustom && (
                          <span className="text-[9px] bg-blue-100 dark:bg-[#004AFF]/30 text-blue-800 dark:text-[#DDE3E7] px-1.5 py-0.5 rounded font-bold uppercase">
                            Custom
                          </span>
                        )}
                        {item.isCustom && (
                          <button
                            onClick={(e) => handleDeleteCustomGesture(item.id, e)}
                            className="text-[10px] text-slate-400 hover:text-red-500 p-0.5 cursor-pointer ml-1"
                            title="Delete custom sign"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 dark:text-[#DDE3E7] mb-0.5">
                      {item.name}
                    </h4>
                    <p className="text-xs font-semibold text-blue-600 dark:text-[#004AFF] mb-1">
                      "{item.word}"
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-slate-500 dark:text-[#DDE3E7]/60 leading-tight line-clamp-2 mb-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100 dark:border-[#004AFF]/20 mt-auto">
                    <button
                      onClick={() => speakText(item.word, voiceEmotion)}
                      className="py-1 px-1 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-[#004AFF]/20 text-[10px] font-semibold text-slate-700 dark:text-[#DDE3E7] flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
                      title="Hear pronunciation in human voice"
                    >
                      <span className="emoji">🔊</span>
                      <span>Voice</span>
                    </button>
                    <button
                      onClick={() => handleWatchVideo(item)}
                      className="py-1 px-1 rounded-lg bg-blue-100 dark:bg-[#004AFF]/20 hover:bg-blue-200 dark:hover:bg-[#004AFF]/35 text-[10px] font-bold text-blue-800 dark:text-[#DDE3E7] flex items-center justify-center gap-0.5 cursor-pointer transition-colors border border-blue-200 dark:border-[#004AFF]/40"
                      title="Watch HD ISL sign video & speak voice (100% accuracy)"
                    >
                      <span className="emoji">🎬</span>
                      <span>Video</span>
                    </button>
                    <button
                      onClick={() => handlePracticeInCamera(item)}
                      className="py-1 px-1 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-[10px] font-semibold text-white flex items-center justify-center gap-0.5 cursor-pointer transition-colors"
                      title="Try this sign in live camera"
                    >
                      <span className="emoji">📹</span>
                      <span>Practice</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : viewMode === "video" ? (
        /* ───────────────────────────────────────────────────────────────── */
        /* VIEW B: HIGH-CLARITY ISL VIDEO TRANSLATOR (SIGN → VOICE)          */
        /* ───────────────────────────────────────────────────────────────── */
        <ISLSignVideoTranslator
          onSendMessage={onSendMessage}
          onSwitchToCamera={() => {
            setViewMode("interpreter");
            if (!isCameraActive) startCamera();
          }}
          voiceEmotion={voiceEmotion}
          setVoiceEmotion={setVoiceEmotion}
          autoSpeak={autoSpeak}
          setAutoSpeak={setAutoSpeak}
          initialSign={targetVideoSign}
        />
      ) : (
        /* ───────────────────────────────────────────────────────────────── */
        /* VIEW C: LIVE CAMERA INTERPRETER WORKSPACE                         */
        /* ───────────────────────────────────────────────────────────────── */
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {/* ── Prominent Camera & Sign Interpreter Stage (Full View) ── */}
          <div
            className={`relative rounded-2xl overflow-hidden flex items-center justify-center border border-white/15 dark:border-white/20 shadow-2xl transition-all flex-1 min-h-0 w-full bg-black dark:bg-[#000000]`}
          >
            {/* Video stage fills the camera container entirely */}
            <div className="absolute inset-0 w-full h-full">
              {/* Permanently mounted Video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform -scale-x-100 ${
                  isCameraActive ? "block" : "hidden"
                }`}
              />

              {/* Real Hand Skeleton Canvas Overlay for BOTH hands */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none ${
                  isCameraActive ? "block" : "hidden"
                }`}
              />
            </div>

            {/* In-Camera Floating ISL Reference Video PiP (Always accessible in Camera Mode) */}
            {showCamRefVideo && (
              <div className="absolute top-12 right-3 w-56 sm:w-64 bg-black/95 dark:bg-[#000000]/95 backdrop-blur-md rounded-2xl border border-white/20 dark:border-white/20 shadow-2xl p-2.5 z-20 flex flex-col gap-2">
                <div className="flex items-center justify-between pb-1 border-b border-white/10 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white dark:text-[#DDE3E7]">
                    <span className="emoji">🎬</span>
                    <span>ISL Sign Video Guide</span>
                  </div>
                  <button
                    onClick={() => setShowCamRefVideo(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer px-1"
                    title="Close video guide"
                  >
                    ✕
                  </button>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    src={getCachedSrc(camRefSign?.path || "/videos/words/Hello.mp4")}
                    autoPlay
                    loop
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-1 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-white font-bold">
                    {camRefSign?.icon} {camRefSign?.word}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (camRefSign) {
                        interpretSign({
                          id: camRefSign.word.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                          name: camRefSign.word,
                          word: camRefSign.word,
                          icon: camRefSign.icon || "🤟",
                        });
                      }
                    }}
                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    title="Speak this sign and send to conversation"
                  >
                    <span className="emoji">🔊</span>
                    <span>Speak Sign</span>
                  </button>
                  <button
                    onClick={() => {
                      setTargetVideoSign(camRefSign);
                      setViewMode("video");
                    }}
                    className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-[#000000] border border-white/10 dark:border-[#004AFF]/40 text-slate-200 dark:text-[#DDE3E7] text-[11px] font-semibold cursor-pointer"
                    title="Open full video translator"
                  >
                    <span>Full ↗</span>
                  </button>
                </div>
              </div>
            )}

            {isCameraActive ? (
              <>
                {/* Status Header Badge (Tracks both hands) */}
                <div className="absolute top-2.5 left-3 flex items-center gap-2 bg-black/85 dark:bg-[#000000]/90 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 dark:border-white/20 text-xs text-white dark:text-[#DDE3E7] font-mono shadow-lg">
                  {aiStatus === "loading" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-spin" />
                      <span>LOADING AI VISION MODEL…</span>
                    </>
                  )}
                  {aiStatus === "ready" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-white dark:text-[#DDE3E7]">
                        HOLD SIGN (ONE OR BOTH HANDS)
                      </span>
                    </>
                  )}
                  {aiStatus === "hand_detected" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-emerald-300">
                        {handsDetectedCount >= 2
                          ? "2 HANDS IN VIEW"
                          : "1 HAND ACTIVE"}
                      </span>
                    </>
                  )}
                  {aiStatus === "error" && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-amber-300">VISION STANDBY (USE BUTTONS BELOW)</span>
                    </>
                  )}
                </div>

                {/* Active Gesture Interpretation Banner with smooth cross-fade transition */}
                {currentGesture && (
                  <div
                    key={currentGesture.id}
                    className="absolute top-2.5 right-3 bg-emerald-950/90 dark:bg-[#000000]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/60 dark:border-emerald-500/60 text-emerald-300 dark:text-[#DDE3E7] text-xs font-bold flex items-center gap-2 shadow-xl transition-all duration-300 ease-out transform scale-100 opacity-100 z-10"
                  >
                    <span className="emoji text-base transition-transform duration-300">{currentGesture.icon}</span>
                    <span className="tracking-wide">RECOGNIZED: "{currentGesture.word}"</span>
                    <span className="text-[10px] bg-emerald-500/30 dark:bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-200 dark:text-[#DDE3E7] font-mono">
                      {currentGesture.confidence}%
                    </span>
                    {currentGesture.singleHandOnly && (
                      <span className="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono">
                        1-HAND ONLY
                      </span>
                    )}
                    {currentGesture.isTwoHanded && (
                      <span className="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono">
                        2-HANDED
                      </span>
                    )}
                    {currentGesture.isCustom && (
                      <span className="text-[9px] bg-white/20 text-white px-1 py-0.2 rounded font-mono">
                        CUSTOM
                      </span>
                    )}
                    {currentGesture.isAIPrediction && (
                      <span className="text-[9px] bg-[#004AFF]/20 text-[#004AFF] dark:text-[#004AFF] border border-[#004AFF]/40 px-1 py-0.2 rounded font-mono">
                        AI MODEL
                      </span>
                    )}
                  </div>
                )}



                {/* In-Camera Quick Trigger Drawer (Collapsible so signing area is 100% unobstructed) */}
                {isQuickDrawerOpen ? (
                  <div className="absolute bottom-2.5 inset-x-2 sm:inset-x-4 bg-slate-950/90 dark:bg-[#000000]/95 backdrop-blur-lg p-2 rounded-xl border border-white/10 dark:border-[#004AFF]/40 shadow-2xl z-20 transition-all">
                    <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#DDE3E7]/70 mb-1 px-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span className="emoji">✨</span>
                        <span>Quick Signs:</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewMode("video")}
                          className="text-emerald-400 dark:text-[#004AFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>🎬 Video Mode ↗</span>
                        </button>
                        <button
                          onClick={() => setViewMode("gallery")}
                          className="text-blue-400 dark:text-[#004AFF] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <span>Full Gallery ({allGesturesList.length}) ↗</span>
                        </button>
                        <button
                          onClick={() => setIsQuickDrawerOpen(false)}
                          className="text-slate-300 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800 dark:bg-[#000000] border border-white/10 cursor-pointer ml-1"
                          title="Minimize drawer to clear signing field"
                        >
                          ▾ Minimize
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {allGesturesList.slice(0, 16).map((g) => (
                        <button
                          key={g.id}
                          onClick={() => interpretSign(g)}
                          className="px-2.5 py-1 bg-slate-800/90 dark:bg-[#000000] hover:bg-blue-600 hover:text-white dark:hover:bg-[#004AFF] dark:hover:text-[#DDE3E7] border border-slate-700 dark:border-[#004AFF]/30 hover:border-blue-400 dark:hover:border-[#004AFF] rounded-lg text-xs font-semibold text-slate-200 dark:text-[#DDE3E7] flex items-center gap-1.5 whitespace-nowrap transition-all shadow-xs cursor-pointer flex-shrink-0"
                          title={`Sign "${g.name}"`}
                        >
                          <span className="emoji text-sm">{g.icon}</span>
                          <span>{g.word}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsQuickDrawerOpen(true)}
                    className="absolute bottom-2.5 left-3 bg-black/85 dark:bg-[#000000]/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 dark:border-white/20 text-[11px] text-white dark:text-[#DDE3E7] font-semibold flex items-center gap-1.5 shadow-lg hover:bg-slate-800 cursor-pointer z-10 transition-all hover:scale-102"
                    title="Open Quick Signs panel"
                  >
                    <span className="emoji">✨</span>
                    <span>Quick Signs (16) ▴</span>
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Interpreted Response Sentence & Voice Output Bar ────────────── */}
      <div className="mt-2.5 flex-shrink-0 bg-blue-50/50 dark:bg-[#000000] p-2.5 rounded-xl border border-blue-200 dark:border-[#004AFF]/30 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-[#DDE3E7] mb-1.5 px-0.5">
          <span className="flex items-center gap-1.5">
            <span className="emoji">💬</span>
            <span>Interpreted Sentence:</span>
          </span>
          {responseText && (
            <button
              onClick={() => setResponseText("")}
              className="text-slate-400 hover:text-slate-600 dark:text-[#DDE3E7]/60 dark:hover:text-[#DDE3E7] text-[10px] font-normal cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Sign with your hands in camera or select from Gallery..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-[#000000] border border-slate-300 dark:border-[#004AFF]/40 rounded-xl text-slate-800 dark:text-[#DDE3E7] placeholder-slate-400 dark:placeholder-[#DDE3E7]/40 focus:outline-none focus:ring-2 focus:ring-[#004AFF] shadow-inner font-medium"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSpeakResponse();
              }
            }}
          />

          <button
            onClick={handleSpeakResponse}
            disabled={!responseText.trim() || isSpeaking}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isSpeaking
                ? "bg-blue-500 dark:bg-[#004AFF] text-white dark:text-[#DDE3E7] animate-pulse"
                : "bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-white dark:text-[#DDE3E7] disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
            title="Speak response"
          >
            <span className="emoji text-base">🔊</span>
            <span>{isSpeaking ? "Speaking..." : "Speak"}</span>
          </button>
        </div>
      </div>

      {/* ── Gesture Training Studio Modal ──────────────────────────────── */}
      {isTrainingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#000000] border border-slate-300 dark:border-[#004AFF]/40 rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl transition-all">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-[#004AFF]/20">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎓</span>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#DDE3E7]">
                  Train Custom Gesture (One or Both Hands)
                </h3>
              </div>
              <button
                onClick={() => setIsTrainingModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-[#DDE3E7] text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-[#DDE3E7]/70 mb-3">
              Hold your custom sign in front of the camera. The optical engine extracts 3D finger feature ratios so the camera interprets and speaks your custom gesture automatically.
            </p>

            <div
              className={`p-2 rounded-xl text-xs flex items-center gap-2 mb-3 border ${
                handsDetectedCount > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-600 text-amber-800 dark:text-amber-200"
              }`}
            >
              <span className="emoji">{handsDetectedCount > 0 ? "✅" : "⚠️"}</span>
              <span className="font-medium">
                {handsDetectedCount > 0
                  ? `${handsDetectedCount === 2 ? "Both hands" : "Hand"} detected in camera — Ready to capture!`
                  : "No hand visible — Place your hand in front of camera"}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-[#DDE3E7] mb-1">
                  Gesture Name:
                </label>
                <input
                  type="text"
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  placeholder="e.g., Water, Doctor, Hungry, Friend"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#000000] border border-slate-300 dark:border-[#004AFF]/40 rounded-xl text-slate-900 dark:text-[#DDE3E7] focus:outline-none focus:ring-2 focus:ring-[#004AFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-[#DDE3E7] mb-1">
                  Spoken Phrase:
                </label>
                <input
                  type="text"
                  value={trainingWord}
                  onChange={(e) => setTrainingWord(e.target.value)}
                  placeholder="e.g., Please give me water"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#000000] border border-slate-300 dark:border-[#004AFF]/40 rounded-xl text-slate-900 dark:text-[#DDE3E7] focus:outline-none focus:ring-2 focus:ring-[#004AFF]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-[#DDE3E7] mb-1">
                  Select Emoji Icon:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setTrainingIcon(emoji)}
                      className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all cursor-pointer ${
                        trainingIcon === emoji
                          ? "bg-blue-600 dark:bg-[#004AFF] text-white scale-110 shadow-xs"
                          : "bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-[#004AFF]/20"
                      }`}
                    >
                      <span className="emoji">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {trainingStatusMessage && (
              <div className="mb-3 text-xs text-blue-700 dark:text-[#DDE3E7] font-semibold bg-blue-50 dark:bg-[#004AFF]/20 p-2 rounded-xl">
                {trainingStatusMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#004AFF]/20">
              <button
                type="button"
                onClick={() => setIsTrainingModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#DDE3E7]/70 hover:bg-slate-100 dark:hover:bg-[#004AFF]/15 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartCaptureTraining}
                disabled={trainingCountdown !== null || !trainingName.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 dark:bg-[#004AFF] dark:hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {trainingCountdown !== null ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>{typeof trainingCountdown === "number" ? `Capture in ${trainingCountdown}s...` : trainingCountdown}</span>
                  </>
                ) : (
                  <>
                    <span>📷</span>
                    <span>Capture & Train Pose</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
