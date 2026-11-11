/**
 * MedSoundSigns Dynamic Time Warping (FastDTW) Motion Gesture Classifier
 *
 * Compares multi-frame 3D hand landmark trajectories against reference sequences
 * loaded from /model/medical_trajectories.json.
 *
 * Runs client-side in WebGL/JS context in < 2ms per window evaluation.
 */

let trajectoryDatabase = null;
let databaseStatus = "idle"; // "idle" | "loading" | "ready" | "error"
let loadPromise = null;

const TRAJECTORY_PATH = "/model/medical_trajectories.json";

/**
 * Loads the reference trajectories database from public assets.
 */
export async function loadTrajectories() {
  if (databaseStatus === "ready") return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      databaseStatus = "loading";
      console.log("[DTWClassifier] Loading medical dynamic trajectories...");
      const res = await fetch(TRAJECTORY_PATH);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch ${TRAJECTORY_PATH}`);
      }
      trajectoryDatabase = await res.json();
      databaseStatus = "ready";
      console.log(`[DTWClassifier] Loaded ${Object.keys(trajectoryDatabase).length} dynamic trajectories.`);
      return true;
    } catch (err) {
      databaseStatus = "error";
      console.error("[DTWClassifier] Failed to load trajectories:", err);
      return false;
    }
  })();

  return loadPromise;
}

export function isTrajectoriesReady() {
  return databaseStatus === "ready" && trajectoryDatabase !== null;
}

/**
 * Calculates Euclidean distance between two 3D landmark arrays (each 21 points).
 */
function frameDistance(frameA, frameB) {
  if (!frameA || !frameB || frameA.length !== frameB.length) return 999;
  let sum = 0;
  const len = frameA.length;
  for (let i = 0; i < len; i++) {
    const ptA = frameA[i];
    const ptB = frameB[i];
    const dx = ptA[0] - ptB[0];
    const dy = ptA[1] - ptB[1];
    const dz = ptA[2] - ptB[2];
    sum += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  return sum / len;
}

/**
 * Computes Dynamic Time Warping distance between sequence A and sequence B
 * with a Sakoe-Chiba constraint band for performance (O(N) time).
 */
export function computeDTWDistance(seqA, seqB, windowSize = 6) {
  const n = seqA.length;
  const m = seqB.length;
  if (n === 0 || m === 0) return Infinity;

  const w = Math.max(windowSize, Math.abs(n - m));
  const dtw = Array.from({ length: n + 1 }, () => new Float32Array(m + 1).fill(Infinity));
  dtw[0][0] = 0;

  for (let i = 1; i <= n; i++) {
    const startJ = Math.max(1, i - w);
    const endJ = Math.min(m, i + w);
    for (let j = startJ; j <= endJ; j++) {
      const cost = frameDistance(seqA[i - 1].landmarks, seqB[j - 1].landmarks);
      // Also consider wrist motion delta if available
      let wristCost = 0;
      if (seqA[i - 1].wrist && seqB[j - 1].wrist) {
        const wdx = seqA[i - 1].wrist[0] - seqB[j - 1].wrist[0];
        const wdy = seqA[i - 1].wrist[1] - seqB[j - 1].wrist[1];
        const wdz = seqA[i - 1].wrist[2] - seqB[j - 1].wrist[2];
        wristCost = Math.sqrt(wdx * wdx + wdy * wdy + wdz * wdz);
      }
      const totalCost = cost + 0.5 * wristCost;

      dtw[i][j] = totalCost + Math.min(
        dtw[i - 1][j],     // insertion
        dtw[i][j - 1],     // deletion
        dtw[i - 1][j - 1]  // match
      );
    }
  }

  // Normalize by warped path length
  const totalWarpedDistance = dtw[n][m];
  return totalWarpedDistance / (n + m);
}

/**
 * Classifies a live rolling landmark sequence against all stored medical trajectories.
 *
 * @param {Array} liveSequence - Array of normalized landmark frames
 * @returns {Object|null} Prediction result or null if no confident match
 */
export function classifyDynamicGesture(liveSequence) {
  if (!isTrajectoriesReady() || !liveSequence || liveSequence.length < 15) {
    return null;
  }

  let bestMatch = null;
  let minDistance = Infinity;

  // We only match against signs that have at least 15 frames
  for (const [key, trajectory] of Object.entries(trajectoryDatabase)) {
    const refFrames = trajectory.frames;
    if (!refFrames || refFrames.length < 10) continue;

    const dist = computeDTWDistance(liveSequence, refFrames);

    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = trajectory;
    }
  }

  // Convert distance to normalized confidence [0.0 - 1.0]
  // In normalized space, average joint error < 0.25 is very close
  const CONFIDENCE_DISTANCE_THRESHOLD = 0.35;
  if (minDistance > CONFIDENCE_DISTANCE_THRESHOLD || !bestMatch) {
    return null;
  }

  const confidence = Math.max(0.0, Math.min(1.0, 1.0 - (minDistance / CONFIDENCE_DISTANCE_THRESHOLD)));

  return {
    label: bestMatch.label,
    key: bestMatch.label.toUpperCase().replace(/\s+/g, '_'),
    confidence: parseFloat(confidence.toFixed(3)),
    critical: Boolean(bestMatch.critical),
    type: bestMatch.type || "clinical",
    distance: parseFloat(minDistance.toFixed(4)),
  };
}

