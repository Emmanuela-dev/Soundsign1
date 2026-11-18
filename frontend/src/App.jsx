import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition.js";
import { useVideoPreloader } from "./hooks/useVideoPreloader.js";
import { ThemeProvider } from "./contexts/ThemeContext.jsx";
import LandingPage from "./components/LandingPage.jsx";
import ClinicianDashboard from "./components/ClinicianDashboard.jsx";
import PatientDashboard from "./components/PatientDashboard.jsx";

function AppContent() {
  // currentRole: null (Landing Page) | "clinician" | "patient"
  const [currentRole, setCurrentRole] = useState(null);

  const [conversationHistory, setConversationHistory] = useState([
    { sender: "hearing", text: "Hello! Welcome to SoundSigns.", timestamp: "12:00 PM" },
    { sender: "gesture", text: "Hello, nice to meet you!", timestamp: "12:01 PM" },
  ]);

  // ── Pre-load all 151 sign videos into browser memory on mount ─────────────
  const { loaded, total, complete } = useVideoPreloader();

  // ── Backend warm-up ping ───────────────────────────────────────────────────
  useEffect(() => {
    const API_BASE_URL = import.meta.env.PROD
      ? "https://soundsigns.onrender.com"
      : "http://localhost:5000";
    fetch(`${API_BASE_URL}/health`).catch(() => {
      // Warm-up ping is non-blocking
    });
  }, []);

  const {
    transcript,
    isl,
    isRecording,
    isProcessing,
    translationError,
    signQueueRef,
    toggleRecording,
    playWord,
    playText,
    submitText,
  } = useSpeechRecognition();

  const handleAddMessage = (msg) => {
    setConversationHistory((prev) => [...prev, msg]);
  };

  const handleSubmitText = (text) => {
    submitText(text);
    handleAddMessage({
      sender: "hearing",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  // 1. Landing Page (First Impression Doorway)
  if (!currentRole) {
    return <LandingPage onSelectRole={(role) => setCurrentRole(role)} />;
  }

  // 2. Clinician Experience ("I am speaking")
  if (currentRole === "clinician") {
    return (
      <ClinicianDashboard
        signQueueRef={signQueueRef}
        transcript={transcript}
        isl={isl}
        isRecording={isRecording}
        toggleRecording={toggleRecording}
        isProcessing={isProcessing}
        playWord={playWord}
        playText={playText}
        submitText={handleSubmitText}
        conversationHistory={conversationHistory}
        onAddMessage={handleAddMessage}
        onSwitchRole={() => setCurrentRole(null)}
      />
    );
  }

  // 3. Deaf User Experience ("I am signing")
  return (
    <PatientDashboard
      onSendMessage={handleAddMessage}
      conversationHistory={conversationHistory}
      onSwitchRole={() => setCurrentRole(null)}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
