// ─────────────────────────────────────────────────────────────────────────────
// motionTracker.js — Temporal Hand Motion & Trajectory Tracking Engine
//
// Tracks hand spatial trajectories across a sliding temporal window of 15-25 frames.
// Enables recognition of dynamic gestures that require movement:
//   1. Waving side-to-side           → "Hello" (👋)
//   2. Forward/outward stroke        → "Thank You" (🙏)
//   3. Upward brushing against chest → "Happy" (😊)
//   4. Vertical fist nodding         → "Yes" (👍)
//   5. Horizontal hand shaking       → "No" (🚫)
// ─────────────────────────────────────────────────────────────────────────────

export class HandMotionTracker {
  constructor(maxFrames = 22) {
    this.maxFrames = maxFrames;
    this.history = []; // Array of frame snapshots: { timestamp, palm, wrist, scale }
    this.motionTrail = []; // Recent screen points for drawing neon trail
  }

  reset() {
    this.history = [];
    this.motionTrail = [];
  }

  softReset() {
    this.history = [];
    // Retain this.motionTrail so the visual neon trail continues to decay smoothly over its 550ms lifecycle
  }

  addFrame(landmarks) {
    if (!landmarks || landmarks.length < 21) {
      if (this.history.length > 0) {
        this.history.shift();
      }
      // Decay motion trail even when landmarks are missing
      const cutoff = Date.now() - 550;
      this.motionTrail = this.motionTrail.filter((pt) => pt.time > cutoff);
      return;
    }

    const wrist = landmarks[0];
    const palm = landmarks[9]; // Middle MCP joint (hand center)
    const indexTip = landmarks[8];

    // Compute palm scale
    const dx = wrist.x - palm.x;
    const dy = wrist.y - palm.y;
    const dz = (wrist.z || 0) - (palm.z || 0);
    const scale = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;

    const frameData = {
      timestamp: Date.now(),
      wrist: { x: wrist.x, y: wrist.y, z: wrist.z || 0 },
      palm: { x: palm.x, y: palm.y, z: palm.z || 0 },
      indexTip: { x: indexTip.x, y: indexTip.y, z: indexTip.z || 0 },
      scale,
    };

    this.history.push(frameData);
    if (this.history.length > this.maxFrames) {
      this.history.shift();
    }

    // Motion trail for visual rendering (last 550ms)
    this.motionTrail.push({
      x: palm.x,
      y: palm.y,
      time: frameData.timestamp,
    });
    const cutoff = Date.now() - 550;
    this.motionTrail = this.motionTrail.filter((pt) => pt.time > cutoff);
  }

  getMotionFeatures() {
    const n = this.history.length;
    if (n < 6) {
      return {
        motionType: "still",
        speed: 0,
        deltaX: 0,
        deltaY: 0,
        deltaZ: 0,
        reversalsX: 0,
        reversalsY: 0,
        isWaving: false,
        isForwardStroke: false,
        isUpwardStroke: false,
        isNodding: false,
        isShaking: false,
        trail: this.motionTrail,
      };
    }

    const first = this.history[0];
    const last = this.history[n - 1];
    const timeSpan = Math.max(0.1, (last.timestamp - first.timestamp) / 1000);
    const avgScale = this.history.reduce((acc, h) => acc + h.scale, 0) / n;

    // Overall displacement normalized by hand scale
    const deltaX = (last.palm.x - first.palm.x) / avgScale;
    const deltaY = (last.palm.y - first.palm.y) / avgScale;
    const deltaZ = (last.palm.z - first.palm.z) / avgScale;

    let reversalsX = 0;
    let reversalsY = 0;
    let reversalsTipX = 0;
    let reversalsTipY = 0;
    let totalPathDist = 0;
    let totalTipDist = 0;
    let lastSignX = 0;
    let lastSignY = 0;
    let lastSignTipX = 0;
    let lastSignTipY = 0;
    let netForwardZ = 0;

    for (let i = 1; i < n; i++) {
      const p1 = this.history[i - 1].palm;
      const p2 = this.history[i].palm;
      const stepX = p2.x - p1.x;
      const stepY = p2.y - p1.y;
      const stepZ = p2.z - p1.z;
      const dist = Math.hypot(stepX, stepY) / avgScale;
      totalPathDist += dist;
      netForwardZ += stepZ / avgScale;

      const tip1 = this.history[i - 1].indexTip;
      const tip2 = this.history[i].indexTip;
      const stepTipX = tip2.x - tip1.x;
      const stepTipY = tip2.y - tip1.y;
      totalTipDist += Math.hypot(stepTipX, stepTipY) / avgScale;

      // Horizontal palm direction change (filters out microscopic camera jitter)
      if (Math.abs(stepX) > 0.015 * avgScale) {
        const signX = Math.sign(stepX);
        if (lastSignX !== 0 && signX !== lastSignX) {
          reversalsX++;
        }
        lastSignX = signX;
      }

      // Horizontal fingertip direction change (captures wrist-tilt waving)
      if (Math.abs(stepTipX) > 0.015 * avgScale) {
        const signTipX = Math.sign(stepTipX);
        if (lastSignTipX !== 0 && signTipX !== lastSignTipX) {
          reversalsTipX++;
        }
        lastSignTipX = signTipX;
      }

      // Vertical palm direction change
      if (Math.abs(stepY) > 0.015 * avgScale) {
        const signY = Math.sign(stepY);
        if (lastSignY !== 0 && signY !== lastSignY) {
          reversalsY++;
        }
        lastSignY = signY;
      }

      // Vertical fingertip direction change (captures nodding fist)
      if (Math.abs(stepTipY) > 0.015 * avgScale) {
        const signTipY = Math.sign(stepTipY);
        if (lastSignTipY !== 0 && signTipY !== lastSignTipY) {
          reversalsTipY++;
        }
        lastSignTipY = signTipY;
      }
    }

    const speed = Math.max(totalPathDist, totalTipDist * 0.8) / timeSpan;
    const deltaScale = (last.scale - first.scale) / avgScale;

    // ── 1. Waving Motion (Horizontal oscillation left-right) ───────────
    // Either palm or fingertips oscillate side-to-side (reversals >= 2)
    const isWaving =
      (reversalsX >= 2 || reversalsTipX >= 2) &&
      (totalPathDist > 0.20 || totalTipDist > 0.26);

    // ── 2. Forward Stroke ("Thank You") ──────────────────────────────
    // Hand starts near chin/mouth and moves forward/downward toward conversation partner
    // deltaY is positive (moving downward from face) or netForwardZ is negative / scale increases
    const isForwardStroke =
      (deltaY > 0.20 || netForwardZ < -0.12 || deltaScale > 0.07) &&
      reversalsX <= 1 &&
      speed > 0.45 &&
      (Math.abs(deltaY) > Math.abs(deltaX) * 0.6 || deltaScale > 0.07);

    // ── 3. Upward Brushing Stroke ("Happy") ───────────────────────────
    // Hand brushes upward against chest: deltaY is negative (moving upward towards chin/face)
    const isUpwardStroke =
      (deltaY < -0.20 || (reversalsY >= 1 && deltaY < -0.12)) &&
      reversalsX <= 1 &&
      speed > 0.45 &&
      Math.abs(deltaY) > Math.abs(deltaX) * 0.65;

    // ── 4. Vertical Nodding ("Yes") ───────────────────────────────────
    const isNodding =
      (reversalsY >= 2 || reversalsTipY >= 2) &&
      (totalPathDist > 0.20 || totalTipDist > 0.26);

    // ── 5. Horizontal Shaking ("No") ──────────────────────────────────
    const isShaking =
      (reversalsX >= 2 || reversalsTipX >= 2) &&
      Math.abs(deltaY) < 0.32;

    let motionType = "still";
    if (isWaving) motionType = "waving";
    else if (isForwardStroke) motionType = "forward_stroke";
    else if (isUpwardStroke) motionType = "upward_brush";
    else if (isNodding) motionType = "nodding";
    else if (isShaking) motionType = "shaking";
    else if (speed > 1.0) motionType = "moving";

    return {
      motionType,
      speed,
      deltaX,
      deltaY,
      deltaZ,
      deltaScale,
      reversalsX,
      reversalsY,
      reversalsTipX,
      reversalsTipY,
      isWaving,
      isForwardStroke,
      isUpwardStroke,
      isNodding,
      isShaking,
      trail: this.motionTrail,
    };
  }
}
