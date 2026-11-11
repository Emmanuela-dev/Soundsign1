// AI Model Integration — Gesture Neural Network
import { predictGesture, isModelReady, loadGestureModel, AI_CONFIDENCE_THRESHOLD } from "../ml/gestureAI";

// Auto-load the gesture AI model on module initialization
loadGestureModel().catch(() => {
  console.warn("[GestureClassifier] AI model not available — using rule-based fallback only");
});

// MediaPipe Hand Skeleton connections (21 landmarks)
export const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17]
];

// Euclidean distance helper in 3D
function dist3D(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 2D distance helper in screen projection
function dist2D(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Extracts a normalized 15-dimensional spatial feature vector from 21 MediaPipe hand landmarks.
 */
export function getFeatureVector(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmScale = dist3D(wrist, middleMcp) || 0.1;

  // 5 Finger extension ratios (Tip to wrist vs PIP to wrist)
  const thumbExt = dist3D(landmarks[4], landmarks[17]) / palmScale;
  const indexExt = dist3D(landmarks[8], wrist) / (dist3D(landmarks[6], wrist) + 0.001);
  const middleExt = dist3D(landmarks[12], wrist) / (dist3D(landmarks[10], wrist) + 0.001);
  const ringExt = dist3D(landmarks[16], wrist) / (dist3D(landmarks[14], wrist) + 0.001);
  const pinkyExt = dist3D(landmarks[20], wrist) / (dist3D(landmarks[18], wrist) + 0.001);

  // 4 Thumb-to-fingertip normalized pinch distances
  const t2i = dist3D(landmarks[4], landmarks[8]) / palmScale;
  const t2m = dist3D(landmarks[4], landmarks[12]) / palmScale;
  const t2r = dist3D(landmarks[4], landmarks[16]) / palmScale;
  const t2p = dist3D(landmarks[4], landmarks[20]) / palmScale;

  // Inter-finger tip distances
  const i2m = dist3D(landmarks[8], landmarks[12]) / palmScale;
  const m2r = dist3D(landmarks[12], landmarks[16]) / palmScale;
  const r2p = dist3D(landmarks[16], landmarks[20]) / palmScale;

  // Orientations relative to palm
  const thumbElevation = (landmarks[4].y - landmarks[2].y) / palmScale;
  const indexElevation = (landmarks[8].y - landmarks[5].y) / palmScale;
  const palmTilt = (landmarks[5].y - landmarks[17].y) / palmScale;

  return [
    parseFloat(thumbExt.toFixed(3)),
    parseFloat(indexExt.toFixed(3)),
    parseFloat(middleExt.toFixed(3)),
    parseFloat(ringExt.toFixed(3)),
    parseFloat(pinkyExt.toFixed(3)),
    parseFloat(t2i.toFixed(3)),
    parseFloat(t2m.toFixed(3)),
    parseFloat(t2r.toFixed(3)),
    parseFloat(t2p.toFixed(3)),
    parseFloat(i2m.toFixed(3)),
    parseFloat(m2r.toFixed(3)),
    parseFloat(r2p.toFixed(3)),
    parseFloat(thumbElevation.toFixed(3)),
    parseFloat(indexElevation.toFixed(3)),
    parseFloat(palmTilt.toFixed(3)),
  ];
}

/**
 * Calculates weighted similarity between two 15-dimensional hand feature vectors.
 * Returns score in range [0.0, 1.0]
 */
export function compareFeatureVectors(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  const weights = [
    1.4, 1.5, 1.5, 1.5, 1.4, // finger extensions
    1.3, 1.2, 1.2, 1.2,      // thumb pinches
    1.0, 1.0, 1.0,           // spreads
    1.2, 1.2, 0.8            // orientations
  ];

  let sumWeightedSqDiff = 0;
  let totalWeight = 0;

  for (let i = 0; i < vecA.length; i++) {
    const w = weights[i] || 1;
    totalWeight += w;
    const diff = vecA[i] - vecB[i];
    sumWeightedSqDiff += w * (diff * diff);
  }

  const weightedDist = Math.sqrt(sumWeightedSqDiff / totalWeight);
  const similarity = Math.max(0, 1 - weightedDist * 1.4);
  return similarity;
}

/**
 * Trains a new custom gesture from sampled landmark frames.
 */
export function trainGestureFromLandmarks(name, word, icon, sampledFrames) {
  if (!sampledFrames || sampledFrames.length === 0) return null;

  const vectors = sampledFrames.map(getFeatureVector).filter(Boolean);
  if (vectors.length === 0) return null;

  const avgVector = [];
  const dim = vectors[0].length;
  for (let i = 0; i < dim; i++) {
    let sum = 0;
    for (let j = 0; j < vectors.length; j++) {
      sum += vectors[j][i];
    }
    avgVector.push(parseFloat((sum / vectors.length).toFixed(3)));
  }

  return {
    id: `custom_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
    name,
    word: word || name,
    icon: icon || "✋",
    vector: avgVector,
    isCustom: true,
    category: "custom",
    confidence: 96,
    isTwoHanded: false,
    singleHandOnly: true,
    hands: 1,
    handBadge: "🖐️ 1 Hand Only",
    description: "Custom gesture trained with 1 hand to eliminate misinterpretation",
  };
}

/**
 * Master catalog of 40+ built-in gestures covering two-handed signs, conversations, numbers, and sign alphabet.
 * Gestures are explicitly partitioned into single-hand only and two-handed interactions to reduce misinterpretation.
 */
export const BUILTIN_GESTURES = [
  // --- Two-Handed Gestures (Require Both Hands Simultaneously) ---
  {
    id: "two_heart",
    name: "Two-Handed Heart",
    icon: "🫶",
    word: "Love / Care",
    category: "two_handed",
    isTwoHanded: true,
    singleHandOnly: false,
    hands: 2,
    handBadge: "👐 2 Hands",
    description: "Form a heart shape touching thumb & index fingertips of both hands (Requires both hands)",
    confidence: 98,
  },
  {
    id: "two_thumbsup",
    name: "Double Thumbs Up",
    icon: "👍👍",
    word: "Awesome / Great job",
    category: "two_handed",
    isTwoHanded: true,
    singleHandOnly: false,
    hands: 2,
    handBadge: "👐 2 Hands",
    description: "Show thumbs up with both hands simultaneously (Requires both hands)",
    confidence: 98,
  },
  {
    id: "two_clap",
    name: "Clap / Applause",
    icon: "👏",
    word: "Congratulations / Good job",
    category: "two_handed",
    isTwoHanded: true,
    singleHandOnly: false,
    hands: 2,
    handBadge: "👐 2 Hands",
    description: "Bring both open palms close facing each other (Requires both hands)",
    confidence: 96,
  },
  {
    id: "two_welcome",
    name: "Open Hands / Welcome",
    icon: "🤗",
    word: "Welcome / Together",
    category: "two_handed",
    isTwoHanded: true,
    singleHandOnly: false,
    hands: 2,
    handBadge: "👐 2 Hands",
    description: "Extend both open palms forward to camera (Requires both hands)",
    confidence: 96,
  },

  // --- Everyday Signs & Expressions (Single-Hand Only to Prevent Misinterpretation) ---
  { id: "wave", name: "Wave / Hello", icon: "👋", word: "Hello", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Open palm waving side-to-side or held upright (Motion Sign)", confidence: 98 },
  { id: "thank_you", name: "Thank You (Forward Motion)", icon: "🙏", word: "Thank you", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Flat open palm moving forward from chin towards person (Motion Sign)", confidence: 98 },
  { id: "happy", name: "Happy (Upward Brush)", icon: "😊", word: "Happy", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Open palm brushing repeatedly upward against chest (Motion Sign)", confidence: 98 },
  { id: "thumbsup", name: "Thumbs Up (Yes)", icon: "👍", word: "Yes", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Closed fist with thumb pointing straight up = Yes (1 hand only)", confidence: 98 },
  { id: "thumbsdown", name: "Thumbs Down (No)", icon: "👎", word: "No", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Closed fist with thumb pointing straight down = No (1 hand only)", confidence: 96 },
  { id: "peace", name: "Peace / Victory / V", icon: "✌️", word: "Peace", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index and middle extended spread apart, others curled (1 hand only)", confidence: 96 },
  { id: "ily", name: "I Love You (ILY)", icon: "🤟", word: "I love you", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Thumb, index, and pinky extended; middle and ring curled (1 hand only)", confidence: 98 },
  { id: "palm", name: "Flat Palm Forward", icon: "✋", word: "Wait a moment", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "4 fingers together straight up, palm vertical (1 hand only)", confidence: 94 },
  { id: "ok", name: "OK Circle", icon: "👌", word: "I understand", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Thumb and index tips touching in O, other 3 fingers extended (1 hand only)", confidence: 97 },
  { id: "fist", name: "Closed Fist", icon: "✊", word: "Solid / Fist", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Tight closed fist with thumb wrapped across (1 hand only)", confidence: 94 },
  { id: "point", name: "Index Pointing", icon: "☝️", word: "You / One", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index finger extended straight up, all other fingers curled (1 hand only)", confidence: 96 },
  { id: "callme", name: "Call Me / Shaka", icon: "🤙", word: "Call me / Later", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Thumb and pinky extended outwards, middle 3 curled (1 hand only)", confidence: 96 },
  { id: "rock", name: "Rock On / Horns", icon: "🤘", word: "Awesome", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index and pinky up, middle/ring curled, thumb folded over (1 hand only)", confidence: 96 },
  { id: "pinch", name: "Pinch / Little Bit", icon: "🤏", word: "A little bit", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Small gap between thumb tip and index tip, others curled (1 hand only)", confidence: 94 },
  { id: "crossed", name: "Crossed Fingers", icon: "🤞", word: "Good luck", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index and middle extended and crossed over each other (1 hand only)", confidence: 95 },
  { id: "bunched", name: "Bunched / Delicious", icon: "🤌", word: "Eat / Food", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "All 5 fingertips touching in a cluster pointing up (1 hand only)", confidence: 96 },
  { id: "fingerheart", name: "Finger Heart", icon: "🫰", word: "Love", category: "basics", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Thumb and index crossed in a mini heart (1 hand only)", confidence: 95 },

  // --- Numbers (Single-Hand Only: Never Signed With Two Hands) ---
  { id: "num_zero", name: "Number 0 (Oval)", icon: "0️⃣", word: "Zero", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Fingertips curled touching thumb tip in oval (1 hand only)", confidence: 94 },
  { id: "num_one", name: "Number 1 (Index)", icon: "1️⃣", word: "One", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Single index finger pointed up (1 hand only)", confidence: 96 },
  { id: "num_two", name: "Number 2 (Two Fingers)", icon: "2️⃣", word: "Two", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index and middle fingers extended (1 hand only)", confidence: 96 },
  { id: "num_three", name: "Number 3 (Three Fingers)", icon: "3️⃣", word: "Three", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index, middle, and ring fingers extended (1 hand only)", confidence: 95 },
  { id: "num_four", name: "Number 4 (Four Fingers)", icon: "4️⃣", word: "Four", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Four fingers extended, thumb folded across palm (1 hand only)", confidence: 95 },
  { id: "num_five", name: "Number 5 (Full Hand)", icon: "5️⃣", word: "Five", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "All five fingers extended and spread (1 hand only)", confidence: 97 },
  { id: "num_six", name: "Number 6 (Thumb-Pinky)", icon: "6️⃣", word: "Six", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "ASL 6: Thumb and pinky touching, index/middle/ring extended (1 hand only)", confidence: 94 },
  { id: "num_seven", name: "Number 7 (Thumb-Ring)", icon: "7️⃣", word: "Seven", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "ASL 7: Thumb and ring touching, index/middle/pinky extended (1 hand only)", confidence: 94 },
  { id: "num_eight", name: "Number 8 (Thumb-Middle)", icon: "8️⃣", word: "Eight", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "ASL 8: Thumb and middle touching, index/ring/pinky extended (1 hand only)", confidence: 94 },
  { id: "num_nine", name: "Number 9 (Thumb-Index)", icon: "9️⃣", word: "Nine", category: "numbers", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "ASL 9: Thumb and index touching, 3 fingers up (1 hand only)", confidence: 95 },

  // --- Manual Alphabet Letters (Single-Hand Only: Standard Manual Alphabet) ---
  { id: "letter_l", name: "Letter L (Right Angle)", icon: "🇱", word: "Letter L", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index finger vertical and thumb horizontal at 90° angle (1 hand only)", confidence: 97 },
  { id: "letter_c", name: "Letter C (Curved Arc)", icon: "©️", word: "Letter C", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Hand curved like letter C (1 hand only)", confidence: 94 },
  { id: "letter_b", name: "Letter B (Flat 4 Up)", icon: "🅱️", word: "Letter B", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Four fingers together straight up, thumb folded across palm (1 hand only)", confidence: 95 },
  { id: "letter_a", name: "Letter A (Side Thumb)", icon: "🅰️", word: "Letter A", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Fist with thumb resting straight up alongside index knuckle (1 hand only)", confidence: 94 },
  { id: "letter_d", name: "Letter D (Index Up, Loop)", icon: "🇩", word: "Letter D", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index straight up with thumb and other fingers forming a circle (1 hand only)", confidence: 95 },
  { id: "letter_o", name: "Letter O (Circle)", icon: "🅾️", word: "Letter O", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "All fingertips meeting thumb in circular O shape (1 hand only)", confidence: 95 },
  { id: "letter_u", name: "Letter U (Together)", icon: "🇺", word: "Letter U", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index and middle extended and held tightly together (1 hand only)", confidence: 95 },
  { id: "letter_w", name: "Letter W (3 Spread Up)", icon: "🖖", word: "Letter W", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Index, middle, and ring fingers spread apart in W shape (1 hand only)", confidence: 95 },
  { id: "letter_i", name: "Letter I (Pinky Only)", icon: "ℹ️", word: "Letter I", category: "letters", isTwoHanded: false, singleHandOnly: true, hands: 1, handBadge: "🖐️ 1 Hand Only", description: "Pinky extended straight up, all other fingers curled (1 hand only)", confidence: 96 },
];

/**
 * Internal single-hand geometric classifier.
 */
function classifySingleHandInternal(landmarks, customGestures = [], motionFeatures = null) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmScale = dist3D(wrist, middleMcp);
  if (palmScale < 0.038) return null; // Too small or noisy

  // 1. Evaluate User Custom Gestures (Top Priority)
  if (customGestures && customGestures.length > 0) {
    const liveVector = getFeatureVector(landmarks);
    if (liveVector) {
      let bestCustom = null;
      let highestSim = 0;
      for (const cg of customGestures) {
        if (!cg.vector) continue;
        const sim = compareFeatureVectors(liveVector, cg.vector);
        if (sim > highestSim) {
          highestSim = sim;
          bestCustom = cg;
        }
      }
      if (bestCustom && highestSim >= 0.84) {
        return {
          id: bestCustom.id,
          name: bestCustom.name,
          icon: bestCustom.icon || "✋",
          word: bestCustom.word || bestCustom.name,
          confidence: Math.round(highestSim * 100),
          isCustom: true,
        };
      }
    }
  }

  // 1B. AI Neural Network Model Inference
  // When the trained AI model is active and confident (>= AI_CONFIDENCE_THRESHOLD),
  // use its prediction. Threshold is imported from gestureAI.js so both files
  // stay in sync — no hardcoded duplicate, no dead zone.
  if (isModelReady()) {
    const liveVector = getFeatureVector(landmarks);
    if (liveVector) {
      const aiResult = predictGesture(liveVector);
      if (aiResult && aiResult.confidence >= AI_CONFIDENCE_THRESHOLD) {
        const gestureMeta = BUILTIN_GESTURES.find((g) => g.id === aiResult.classId);
        if (gestureMeta) {
          return {
            ...gestureMeta,
            confidence: Math.round(aiResult.confidence * 100),
            isAIPrediction: true,
            modelBadge: "🧠 AI Neural Net",
          };
        }
      }
    }
  }

  // 2. High-Precision Feature Ratios & Local Hand Orientation (Angle-Invariant)
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexTip = landmarks[8];

  const middlePip = landmarks[10];
  const middleTip = landmarks[12];

  const ringPip = landmarks[14];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyTip = landmarks[20];

  // 3. Compute 3D Local Hand Coordinate System (Angle & Rotation Invariant)
  // Up vector: points along forearm from wrist towards knuckles
  const ux = middleMcp.x - wrist.x;
  const uy = middleMcp.y - wrist.y;
  const uz = (middleMcp.z || 0) - (wrist.z || 0);
  const upLen = Math.sqrt(ux * ux + uy * uy + uz * uz) || 0.001;
  const normUp = { x: ux / upLen, y: uy / upLen, z: uz / upLen };

  // Side vector: across the palm from index MCP to pinky MCP
  const sx = pinkyMcp.x - indexMcp.x;
  const sy = pinkyMcp.y - indexMcp.y;
  const sz = (pinkyMcp.z || 0) - (indexMcp.z || 0);
  const sideLen = Math.sqrt(sx * sx + sy * sy + sz * sz) || 0.001;
  const normSide = { x: sx / sideLen, y: sy / sideLen, z: sz / sideLen };

  // Thumb Vector: from thumb MCP joint to thumb tip
  const tx = thumbTip.x - thumbMcp.x;
  const ty = thumbTip.y - thumbMcp.y;
  const tz = (thumbTip.z || 0) - (thumbMcp.z || 0);
  const tLen = Math.sqrt(tx * tx + ty * ty + tz * tz) || 0.001;

  // Vertical camera direction of thumb (y increases downwards in camera frame):
  // < -0.40: thumb pointing upward towards top of camera (ceiling)
  // > 0.40: thumb pointing downward towards bottom of camera (floor)
  const normThumbY = ty / tLen;

  // Dot product of thumb with Hand Up Vector:
  // > 0.36: thumb pointing towards fingertips (Thumbs Up, Palm)
  // < -0.36: thumb pointing backwards towards wrist/arm (Thumbs Down)
  const thumbUpDot = (tx * normUp.x + ty * normUp.y + tz * normUp.z) / tLen;

  // Dot product of thumb with Hand Side Vector (spread horizontally)
  const thumbSideDot = (tx * normSide.x + ty * normSide.y + tz * normSide.z) / tLen;

  const ringMcp = landmarks[13];

  // 4. Finger extension ratios (tip to wrist vs pip to wrist) - naturally scale and rotation invariant
  const indexExtRatio = dist3D(indexTip, wrist) / (dist3D(indexPip, wrist) + 0.001);
  const middleExtRatio = dist3D(middleTip, wrist) / (dist3D(middlePip, wrist) + 0.001);
  const ringExtRatio = dist3D(ringTip, wrist) / (dist3D(ringPip, wrist) + 0.001);
  const pinkyExtRatio = dist3D(pinkyTip, wrist) / (dist3D(pinkyPip, wrist) + 0.001);

  // Reliable curled & extended states (adapted to finger anatomy and perspective)
  const isIndexExt = indexExtRatio > 1.12 && dist3D(indexTip, indexMcp) > palmScale * 0.65;
  const isIndexCurled = !isIndexExt && (indexExtRatio < 1.08 || dist3D(indexTip, indexMcp) < palmScale * 0.52);

  const isMiddleExt = middleExtRatio > 1.12 && dist3D(middleTip, middleMcp) > palmScale * 0.70;
  const isMiddleCurled = !isMiddleExt && (middleExtRatio < 1.08 || dist3D(middleTip, middleMcp) < palmScale * 0.55);

  const isRingExt = ringExtRatio > 1.12 && dist3D(ringTip, ringMcp) > palmScale * 0.65;
  const isRingCurled = !isRingExt && (ringExtRatio < 1.08 || dist3D(ringTip, ringMcp) < palmScale * 0.52);

  const isPinkyExt = pinkyExtRatio > 1.10 && dist3D(pinkyTip, pinkyMcp) > palmScale * 0.45;
  const isPinkyCurled = !isPinkyExt && (pinkyExtRatio < 1.06 || dist3D(pinkyTip, pinkyMcp) < palmScale * 0.42);

  // Thumb state (measured relative to hand structure)
  const thumbPinkyDist = dist3D(thumbTip, pinkyMcp);
  const isThumbExt = thumbPinkyDist > palmScale * 0.88 || dist3D(thumbTip, indexMcp) > palmScale * 0.68 || Math.abs(thumbSideDot) > 0.52;
  const isThumbCurled = !isThumbExt && dist3D(thumbTip, indexMcp) < palmScale * 0.50;

  // Multi-angle Thumb orientations (evaluates both hand coordinate frame and camera vertical)
  const isThumbPointingUp = thumbUpDot > 0.36 || (normThumbY < -0.42 && thumbTip.y < indexMcp.y);
  const isThumbPointingDown = thumbUpDot < -0.36 || (normThumbY > 0.42 && thumbTip.y > thumbMcp.y);

  // Pinch distances
  const t2i = dist3D(thumbTip, indexTip);
  const t2m = dist3D(thumbTip, middleTip);
  const t2r = dist3D(thumbTip, ringTip);
  const t2p = dist3D(thumbTip, pinkyTip);

  const isThumbIndexPinch = t2i < palmScale * 0.25;
  const isThumbMiddlePinch = t2m < palmScale * 0.25;
  const isThumbRingPinch = t2r < palmScale * 0.25;
  const isThumbPinkyPinch = t2p < palmScale * 0.25;

  // Bunched / Italian gesture
  const isAllBunched =
    t2i < palmScale * 0.32 &&
    t2m < palmScale * 0.34 &&
    t2r < palmScale * 0.36 &&
    t2p < palmScale * 0.38 &&
    dist3D(indexTip, middleTip) < palmScale * 0.25;

  const extendedCount =
    (isIndexExt ? 1 : 0) + (isMiddleExt ? 1 : 0) + (isRingExt ? 1 : 0) + (isPinkyExt ? 1 : 0);
  const curledCount =
    (isIndexCurled ? 1 : 0) + (isMiddleCurled ? 1 : 0) + (isRingCurled ? 1 : 0) + (isPinkyCurled ? 1 : 0);

  // Filter out completely relaxed or transitional hand (e.g. neither extended nor curled)
  if (extendedCount === 0 && curledCount < 3) {
    return null; // Neutral / resting hand
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DYNAMIC MOTION GESTURES (Temporal Trajectory Evaluation)
  // Evaluated when the hand is actively performing motion (waving, brushing, forward stroke, nodding)
  // ─────────────────────────────────────────────────────────────────────────
  const isThumbTuckedAcross = isThumbCurled && dist3D(thumbTip, indexMcp) < palmScale * 0.38;

  if (motionFeatures) {
    // 0A. Waving Motion (Wave / Hello 👋)
    // Horizontal side-to-side oscillation with open palm
    if (
      motionFeatures.isWaving &&
      (extendedCount >= 3 || (!isIndexCurled && !isMiddleCurled && !isRingCurled)) &&
      !isThumbTuckedAcross
    ) {
      return {
        id: "wave",
        name: "Wave / Hello",
        icon: "👋",
        word: "Hello",
        confidence: 99,
        isDynamicMotion: true,
        motionLabel: "🌊 Waving Motion",
      };
    }

    // 0B. Forward / Outward Stroke (Thank You 🙏)
    // Flat palm starting near chin/mouth and moving forward/downward toward person
    if (
      motionFeatures.isForwardStroke &&
      (extendedCount >= 3 || (!isIndexCurled && !isMiddleCurled)) &&
      !isThumbIndexPinch
    ) {
      return {
        id: "thank_you",
        name: "Thank You (Forward Motion)",
        icon: "🙏",
        word: "Thank you",
        confidence: 98,
        isDynamicMotion: true,
        motionLabel: "➡️ Forward Stroke (Thank You)",
      };
    }

    // 0C. Upward Brushing Stroke (Happy 😊)
    // Open flat palm brushing upward against chest towards chin
    if (
      motionFeatures.isUpwardStroke &&
      (extendedCount >= 3 || (!isIndexCurled && !isMiddleCurled))
    ) {
      return {
        id: "happy",
        name: "Happy (Upward Brush)",
        icon: "😊",
        word: "Happy",
        confidence: 98,
        isDynamicMotion: true,
        motionLabel: "⬆️ Upward Brush (Happy)",
      };
    }

    // 0D. Vertical Fist Nodding (Yes 👍)
    if (
      motionFeatures.isNodding &&
      curledCount >= 3 &&
      !isIndexExt && !isMiddleExt
    ) {
      return {
        id: "thumbsup",
        name: "Yes (Nodding Fist)",
        icon: "👍",
        word: "Yes",
        confidence: 98,
        isDynamicMotion: true,
        motionLabel: "↕️ Nodding Motion (Yes)",
      };
    }

    // 0E. Horizontal Shaking (No 🚫)
    if (
      motionFeatures.isShaking &&
      (isIndexExt || extendedCount >= 3)
    ) {
      return {
        id: "thumbsdown",
        name: "No (Shaking Motion)",
        icon: "👎",
        word: "No",
        confidence: 97,
        isDynamicMotion: true,
        motionLabel: "↔️ Shaking Motion (No)",
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Mutually Exclusive Geometric Rules (Angle & Rotation Invariant)
  // ─────────────────────────────────────────────────────────────────────────

  // 1. Bunched / Food (🤌)
  if (isAllBunched) {
    return { id: "bunched", name: "Bunched / Food", icon: "🤌", word: "Eat / Food", confidence: 96 };
  }

  // 2. Finger Heart (🫰 "Love")
  // Thumb and index fingertips crossed over each other in mini-heart; other 3 fingers curled
  if (
    isMiddleCurled && isRingCurled && isPinkyCurled &&
    t2i >= palmScale * 0.08 && t2i <= palmScale * 0.32 &&
    dist3D(indexTip, indexMcp) < palmScale * 1.15
  ) {
    return { id: "fingerheart", name: "Finger Heart", icon: "🫰", word: "Love", confidence: 95 };
  }

  // 3. Pinch / Little Bit (🤏)
  if (
    isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled &&
    t2i >= palmScale * 0.12 && t2i <= palmScale * 0.26
  ) {
    return { id: "pinch", name: "Pinch / Little Bit", icon: "🤏", word: "A little bit", confidence: 94 };
  }

  // 4. Crossed Fingers / Good Luck (🤞)
  if (
    isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled &&
    dist3D(indexTip, middleTip) < palmScale * 0.18
  ) {
    return { id: "crossed", name: "Crossed Fingers", icon: "🤞", word: "Good luck", confidence: 95 };
  }

  // 5. Thumbs Up / Yes (👍)
  // Tight closed fist with thumb pointing up along hand axis or camera vertical = "Yes"
  if (
    isThumbPointingUp &&
    curledCount >= 3 &&
    !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt &&
    dist3D(thumbTip, indexMcp) > palmScale * 0.35
  ) {
    return { id: "thumbsup", name: "Thumbs Up (Yes)", icon: "👍", word: "Yes", confidence: 98 };
  }

  // 6. Thumbs Down / No (👎)
  // Tight closed fist with thumb pointing down along arm axis or camera vertical = "No"
  // NEVER matches on heart, pinch, or open hands!
  const isTightThumbsDownFist =
    curledCount >= 3 &&
    !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt &&
    dist3D(thumbTip, indexTip) > palmScale * 0.30 &&
    dist3D(thumbTip, indexMcp) > palmScale * 0.30; // Not tucked inside fist like closed fist!

  if (isThumbPointingDown && isTightThumbsDownFist) {
    return { id: "thumbsdown", name: "Thumbs Down (No)", icon: "👎", word: "No", confidence: 96 };
  }

  // 7. Letter L (🇱) - Index vertical along hand axis, thumb sticking out perpendicular
  if (
    isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled &&
    (isThumbExt || Math.abs(thumbSideDot) > 0.45) &&
    dist3D(thumbTip, indexTip) > palmScale * 0.65
  ) {
    return { id: "letter_l", name: "Letter L / Look", icon: "🇱", word: "Letter L", confidence: 97 };
  }

  // 8. ILY Sign (🤟 "I love you")
  // Thumb, index, and pinky extended; middle and ring curled
  if (
    (isThumbExt || isThumbPointingUp || Math.abs(thumbSideDot) > 0.45) &&
    isIndexExt &&
    isPinkyExt &&
    isMiddleCurled &&
    isRingCurled &&
    dist3D(indexTip, pinkyTip) > palmScale * 0.50
  ) {
    return { id: "ily", name: "I Love You (ILY)", icon: "🤟", word: "I love you", confidence: 98 };
  }

  // 9. Rock On / Horns (🤘)
  if (isIndexExt && isPinkyExt && isMiddleCurled && isRingCurled && !isThumbExt) {
    return { id: "rock", name: "Rock On / Horns", icon: "🤘", word: "Awesome", confidence: 96 };
  }

  // 10. Call Me / Shaka (🤙)
  if (isThumbExt && isPinkyExt && isIndexCurled && isMiddleCurled && isRingCurled) {
    return { id: "callme", name: "Call Me / Shaka", icon: "🤙", word: "Call me / Later", confidence: 96 };
  }

  // 11. Pinky Only / Letter I (ℹ️)
  if (isPinkyExt && isIndexCurled && isMiddleCurled && isRingCurled && !isThumbExt) {
    return { id: "letter_i", name: "Letter I (Pinky)", icon: "ℹ️", word: "Letter I", confidence: 96 };
  }

  // 12. OK Sign / ASL 9 (👌 / 9️⃣)
  if (isThumbIndexPinch && isMiddleExt && isRingExt && isPinkyExt) {
    return { id: "ok", name: "OK / Understood", icon: "👌", word: "I understand", confidence: 97 };
  }

  // 13. ASL Number 8 (8️⃣)
  if (isThumbMiddlePinch && isIndexExt && isRingExt && isPinkyExt && !isThumbIndexPinch) {
    return { id: "num_eight", name: "Number 8", icon: "8️⃣", word: "Eight", confidence: 95 };
  }

  // 14. ASL Number 7 (7️⃣)
  if (isThumbRingPinch && isIndexExt && isMiddleExt && isPinkyExt && !isThumbIndexPinch) {
    return { id: "num_seven", name: "Number 7", icon: "7️⃣", word: "Seven", confidence: 95 };
  }

  // 15. ASL Number 6 (6️⃣)
  if (isThumbPinkyPinch && isIndexExt && isMiddleExt && isRingExt && !isThumbIndexPinch) {
    return { id: "num_six", name: "Number 6", icon: "6️⃣", word: "Six", confidence: 95 };
  }

  // 16. Peace / Victory / Number 2 (✌️ / 2️⃣)
  if (
    isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled &&
    dist3D(indexTip, middleTip) > palmScale * 0.26 && !isThumbIndexPinch
  ) {
    return { id: "peace", name: "Peace / Two", icon: "✌️", word: "Two / Peace", confidence: 97 };
  }

  // 17. Letter U (🇺)
  if (
    isIndexExt && isMiddleExt && isRingCurled && isPinkyCurled &&
    dist3D(indexTip, middleTip) <= palmScale * 0.22 && !isThumbIndexPinch
  ) {
    return { id: "letter_u", name: "Letter U", icon: "🇺", word: "Letter U", confidence: 95 };
  }

  // 18. Letter W / Number 3 (🖖 / 3️⃣)
  if (isIndexExt && isMiddleExt && isRingExt && isPinkyCurled) {
    return { id: "num_three", name: "Three / Letter W", icon: "🖖", word: "Three", confidence: 96 };
  }

  // 19. Open Palm / Wave / Hello (👋 / 5️⃣)
  // When an open hand is raised facing the camera with 4 or 5 extended fingers and thumb not tucked
  if (
    (extendedCount === 4 || (extendedCount === 3 && isIndexExt && isMiddleExt && isRingExt && !isPinkyCurled)) &&
    !isThumbTuckedAcross &&
    !isThumbIndexPinch
  ) {
    return { id: "wave", name: "Wave / Open Palm", icon: "👋", word: "Hello", confidence: 97 };
  }

  // 20. Number 4 (4️⃣) - 4 fingers spread upright, thumb tucked across palm
  const isFourFingersSpread =
    dist3D(indexTip, pinkyTip) > palmScale * 0.65 &&
    dist3D(indexTip, middleTip) > palmScale * 0.18;

  if (extendedCount === 4 && isThumbTuckedAcross && isFourFingersSpread) {
    return { id: "num_four", name: "Number 4", icon: "4️⃣", word: "Four", confidence: 96 };
  }

  // 21. Letter B (🅱️) - 4 fingers together upright, thumb tucked across palm
  const isFourFingersTogether = dist3D(indexTip, pinkyTip) <= palmScale * 0.58;
  if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt && isFourFingersTogether && isThumbTuckedAcross) {
    return { id: "letter_b", name: "Letter B", icon: "🅱️", word: "Letter B", confidence: 96 };
  }

  // 22. Flat Palm Forward / Stop (✋)
  if (extendedCount === 4) {
    return { id: "palm", name: "Flat Palm / Stop", icon: "✋", word: "Wait a moment", confidence: 95 };
  }

  // 23. Pointing / Number 1 (☝️ / 1️⃣)
  if (isIndexExt && isMiddleCurled && isRingCurled && isPinkyCurled && !isThumbPointingUp) {
    return { id: "point", name: "Pointing / One", icon: "☝️", word: "You / One", confidence: 96 };
  }

  // 24. Letter C (©️)
  if (
    t2i > palmScale * 0.45 && t2i < palmScale * 0.75 &&
    !isIndexExt && !isIndexCurled && !isMiddleExt && !isMiddleCurled
  ) {
    return { id: "letter_c", name: "Letter C", icon: "©️", word: "Letter C", confidence: 94 };
  }

  // 25. Number 0 / Letter O (0️⃣ / 🅾️)
  if (
    t2i < palmScale * 0.28 &&
    t2m < palmScale * 0.32 &&
    t2r < palmScale * 0.36 &&
    !isIndexExt && !isMiddleExt
  ) {
    return { id: "letter_o", name: "Letter O / Zero", icon: "🅾️", word: "Letter O", confidence: 95 };
  }

  // 26. Letter A (🅰️)
  if (
    curledCount === 4 &&
    dist3D(thumbTip, indexPip) < palmScale * 0.38 &&
    !isThumbPointingDown
  ) {
    return { id: "letter_a", name: "Letter A", icon: "🅰️", word: "Letter A", confidence: 94 };
  }

  // 27. Closed Fist (✊)
  if (curledCount === 4 && isThumbCurled) {
    return { id: "fist", name: "Closed Fist", icon: "✊", word: "Solid / Fist", confidence: 94 };
  }

  return null;
}

/**
 * Classifies a single hand and guarantees single-hand-only metadata.
 */
export function classifySingleHand(landmarks, customGestures = [], motionFeatures = null) {
  const result = classifySingleHandInternal(landmarks, customGestures, motionFeatures);
  if (!result) return null;
  return {
    ...result,
    isTwoHanded: false,
    singleHandOnly: true,
    hands: 1,
    handBadge: "🖐️ 1 Hand Only",
  };
}

/**
 * Determines whether a detected hand is actively raised and signing in frame,
 * or whether it is just a passive/resting hand at the bottom boundary (e.g. resting on desk/keyboard).
 */
export function isActiveSigningHand(landmarks) {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmScale = dist3D(wrist, middleMcp);

  // Filter out tiny or out-of-range artifacts
  if (palmScale < 0.035) return false;

  // Filter out hands resting on keyboard/desk at very bottom of screen
  if (wrist.y > 0.92 && landmarks[12].y > 0.85) return false;

  return true;
}

/**
 * Classifies gestures from multiple hands (1 or 2 hands simultaneously).
 * First tests for Two-Handed interactions, then evaluates individual hands.
 *
 * NOTE: Single-hand only gestures are strictly rejected when 2 active hands
 * are present in the camera to eliminate false positives and misinterpretation.
 *
 * @param {Array<Array<{x: number, y: number, z: number}>>} multiLandmarks - Array of hands (up to 2)
 * @param {Array<object>} customGestures - User trained custom gestures
 * @returns {object|null} recognized gesture object
 */
export function classifyHandGesture(multiLandmarks, customGestures = [], motionFeatures = null) {
  if (!multiLandmarks || multiLandmarks.length === 0) return null;

  // Filter out passive/resting hands on desk to isolate active signing hands
  const activeHands = multiLandmarks.filter(isActiveSigningHand);
  if (activeHands.length === 0) return null;

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Dual-Hand Scenario (When 2 active hands are present in camera)
  // ─────────────────────────────────────────────────────────────────────────
  if (activeHands.length >= 2) {
    const handA = activeHands[0];
    const handB = activeHands[1];

    if (handA && handA.length >= 21 && handB && handB.length >= 21) {
      const wristA = handA[0];
      const wristB = handB[0];
      const palmA = handA[9];
      const palmB = handB[9];
      const thumbTipA = handA[4];
      const thumbTipB = handB[4];
      const indexTipA = handA[8];
      const indexTipB = handB[8];

      const distPalms = dist2D(palmA, palmB);
      const distThumbs = dist2D(thumbTipA, thumbTipB);
      const distIndex = dist2D(indexTipA, indexTipB);
      const distWrists = dist2D(wristA, wristB);

      // (A) Two-Handed Heart (🫶)
      if (distThumbs < 0.24 && distIndex < 0.24 && distWrists < 0.44) {
        return {
          id: "two_heart",
          name: "Two-Handed Heart",
          icon: "🫶",
          word: "Love / Care",
          confidence: 99,
          isTwoHanded: true,
          singleHandOnly: false,
          hands: 2,
          handBadge: "👐 2 Hands",
        };
      }

      // (B) Double Thumbs Up (👍👍)
      const gestureA = classifySingleHand(handA, customGestures, motionFeatures);
      const gestureB = classifySingleHand(handB, customGestures, motionFeatures);
      if (gestureA?.id === "thumbsup" && gestureB?.id === "thumbsup") {
        return {
          id: "two_thumbsup",
          name: "Double Thumbs Up",
          icon: "👍👍",
          word: "Awesome / Great job",
          confidence: 99,
          isTwoHanded: true,
          singleHandOnly: false,
          hands: 2,
          handBadge: "👐 2 Hands",
        };
      }

      // (D) Two-Handed Happy (😊 Upward Brushing Motion with Both Hands)
      if (
        motionFeatures?.isUpwardStroke ||
        (gestureA?.id === "happy" && gestureB?.id === "happy")
      ) {
        return {
          id: "happy",
          name: "Happy (Two-Handed)",
          icon: "😊",
          word: "Happy",
          confidence: 99,
          isTwoHanded: true,
          singleHandOnly: false,
          hands: 2,
          handBadge: "👐 2 Hands",
          motionLabel: "⬆️ Upward Brush (Happy)",
        };
      }

      // (E) Clap / Applause (👏)
      if (distPalms < 0.14 && distWrists < 0.22) {
        return {
          id: "two_clap",
          name: "Clap / Applause",
          icon: "👏",
          word: "Congratulations / Good job",
          confidence: 97,
          isTwoHanded: true,
          singleHandOnly: false,
          hands: 2,
          handBadge: "👐 2 Hands",
        };
      }

      // (F) Open Both Hands / Welcome (🤗)
      if (gestureA?.id === "wave" && gestureB?.id === "wave") {
        return {
          id: "two_welcome",
          name: "Open Hands / Welcome",
          icon: "🤗",
          word: "Welcome / Together",
          confidence: 97,
          isTwoHanded: true,
          singleHandOnly: false,
          hands: 2,
          handBadge: "👐 2 Hands",
        };
      }

      // CRITICAL REQUIREMENT: Single-hand only gestures MUST NOT be triggered
      // when 2 active hands are present! This eliminates false triggers and cross-hand misinterpretations.
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Single-Hand Scenario (When exactly 1 active hand is in camera view)
  // ─────────────────────────────────────────────────────────────────────────
  const primaryHand = activeHands[0];
  const singleResult = classifySingleHand(primaryHand, customGestures, motionFeatures);
  if (singleResult?.isTwoHanded) return null;

  return singleResult;
}

// Cache of previous frame landmark positions for smooth exponential interpolation (lerp)
const smoothedLandmarksMap = new Map();

export function clearSmoothedLandmarks() {
  smoothedLandmarksMap.clear();
}

/**
 * Draws real hand skeleton and tracking overlays for BOTH hands on canvas.
 */
export function drawHandTracking(ctx, multiLandmarks, width, height, currentGesture, motionFeatures = null) {
  if (!multiLandmarks || multiLandmarks.length === 0) {
    smoothedLandmarksMap.clear();
    ctx.clearRect(0, 0, width, height);
    return;
  }

  ctx.clearRect(0, 0, width, height);
  const isMatched = !!currentGesture;

  // 0. Render dynamic motion trajectory trail if hand is in motion
  if (motionFeatures?.trail && motionFeatures.trail.length > 1) {
    ctx.save();
    const trail = motionFeatures.trail;
    ctx.beginPath();
    for (let i = 0; i < trail.length; i++) {
      const pt = trail[i];
      const screenX = (1 - pt.x) * width;
      const screenY = pt.y * height;
      if (i === 0) ctx.moveTo(screenX, screenY);
      else ctx.lineTo(screenX, screenY);
    }
    ctx.strokeStyle = isMatched ? "rgba(34, 197, 94, 0.6)" : "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Trajectory glow points
    trail.forEach((pt, i) => {
      const alpha = (i / trail.length) * 0.75;
      ctx.fillStyle = isMatched ? `rgba(74, 222, 128, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc((1 - pt.x) * width, pt.y * height, 2.5 + (i / trail.length) * 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  multiLandmarks.forEach((landmarks, handIndex) => {
    if (!landmarks || landmarks.length === 0) return;

    // Convert normalized landmarks to canvas coordinates (mirrored X)
    const rawPts = landmarks.map((lm) => ({
      x: (1 - lm.x) * width,
      y: lm.y * height,
    }));

    // Exponential smoothing (lerp) across frames for smooth transitions without sensor jitter
    const prevPts = smoothedLandmarksMap.get(handIndex);
    const alpha = 0.72; // High responsiveness while eliminating high-frequency landmark jitter
    const pts = rawPts.map((pt, i) => {
      if (!prevPts || !prevPts[i]) return pt;
      return {
        x: prevPts[i].x * (1 - alpha) + pt.x * alpha,
        y: prevPts[i].y * (1 - alpha) + pt.y * alpha,
      };
    });
    smoothedLandmarksMap.set(handIndex, pts);

    // 1. Skeleton lines (Clean White / Emerald Green - No blue on video)
    ctx.strokeStyle = isMatched
      ? "rgba(34, 197, 94, 0.9)"
      : handIndex === 0
      ? "rgba(255, 255, 255, 0.85)"
      : "rgba(220, 226, 232, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      if (pts[startIdx] && pts[endIdx]) {
        ctx.beginPath();
        ctx.moveTo(pts[startIdx].x, pts[startIdx].y);
        ctx.lineTo(pts[endIdx].x, pts[endIdx].y);
        ctx.stroke();
      }
    }

    // 2. Landmark Dots (Clean White / Emerald Green - No blue)
    pts.forEach((pt, idx) => {
      ctx.beginPath();
      if ([4, 8, 12, 16, 20].includes(idx)) {
        // Fingertips
        ctx.fillStyle = isMatched ? "#22c55e" : "#ffffff";
        ctx.arc(pt.x, pt.y, 5.5, 0, Math.PI * 2);
      } else if (idx === 0) {
        // Wrist
        ctx.fillStyle = isMatched ? "#10b981" : "#e2e8f0";
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      } else {
        // Knuckles / joints
        ctx.fillStyle = isMatched ? "rgba(74, 222, 128, 0.95)" : "rgba(255, 255, 255, 0.85)";
        ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
      }
      ctx.fill();
    });

    // 3. Compute Bounding Box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach((pt) => {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    });

    const pad = 22;
    minX = Math.max(8, minX - pad);
    maxX = Math.min(width - 8, maxX + pad);
    minY = Math.max(8, minY - pad);
    maxY = Math.min(height - 8, maxY + pad);
    const boxW = maxX - minX;
    const boxH = maxY - minY;

    // Corner brackets
    ctx.strokeStyle = isMatched ? "rgba(34, 197, 94, 0.95)" : "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2.5;
    const corner = Math.min(22, boxW * 0.25, boxH * 0.25);

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(minX, minY + corner);
    ctx.lineTo(minX, minY);
    ctx.lineTo(minX + corner, minY);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(maxX - corner, minY);
    ctx.lineTo(maxX, minY);
    ctx.lineTo(maxX, minY + corner);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(minX, maxY - corner);
    ctx.lineTo(minX, maxY);
    ctx.lineTo(minX + corner, maxY);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(maxX - corner, maxY);
    ctx.lineTo(maxX, maxY);
    ctx.lineTo(maxX, maxY - corner);
    ctx.stroke();

    // Bounding Box Label
    let tagText = "";
    if (isMatched && (currentGesture.isTwoHanded || handIndex === 0)) {
      const modeSuffix = currentGesture.isTwoHanded ? "[2 HANDS]" : "[1 HAND ONLY]";
      const motionTag = currentGesture.motionLabel ? ` ${currentGesture.motionLabel}` : "";
      tagText = `${currentGesture.icon} ${currentGesture.name}: "${currentGesture.word}" ${modeSuffix}${motionTag} (${currentGesture.confidence}%)`;
    } else if (motionFeatures?.motionType && motionFeatures.motionType !== "still") {
      tagText = `● MOTION: ${motionFeatures.motionType.toUpperCase().replace("_", " ")} DETECTED`;
    } else if (multiLandmarks.length > 1) {
      tagText = `● HAND ${handIndex + 1} (USE 1 HAND FOR 1-HAND SIGNS)`;
    } else {
      tagText = "● 1 HAND ACTIVE (OPTICAL + MOTION TRACKING)";
    }

    ctx.font = "bold 11px Inter, system-ui, sans-serif";
    const textWidth = ctx.measureText(tagText).width;

    ctx.fillStyle = isMatched ? "rgba(5, 46, 22, 0.9)" : "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(minX, Math.max(0, minY - 24), textWidth + 16, 22);

    ctx.fillStyle = isMatched ? "#4ade80" : "#ffffff";
    ctx.fillText(tagText, minX + 8, Math.max(14, minY - 9));
  });
}
