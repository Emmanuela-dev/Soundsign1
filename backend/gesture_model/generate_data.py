"""
Synthetic Data Generator for Sound-Signs Gesture AI Model.

Generates training data by encoding the geometric rules from gestureClassifier.js
as feature profiles (mean ± std) in the 15-dimensional feature space.

Feature vector layout (15D):
  [0]  thumbExt      — thumb extension: dist(thumbTip, pinkyMcp) / palmScale
  [1]  indexExt      — index extension ratio: dist(indexTip, wrist) / dist(indexPip, wrist)
  [2]  middleExt     — middle extension ratio
  [3]  ringExt       — ring extension ratio
  [4]  pinkyExt      — pinky extension ratio
  [5]  t2i           — thumb-to-index tip distance / palmScale
  [6]  t2m           — thumb-to-middle tip distance / palmScale
  [7]  t2r           — thumb-to-ring tip distance / palmScale
  [8]  t2p           — thumb-to-pinky tip distance / palmScale
  [9]  i2m           — index-to-middle tip spread / palmScale
  [10] m2r           — middle-to-ring tip spread / palmScale
  [11] r2p           — ring-to-pinky tip spread / palmScale
  [12] thumbElevation — (thumbTip.y - thumbMcp.y) / palmScale
  [13] indexElevation — (indexTip.y - indexMcp.y) / palmScale
  [14] palmTilt       — (indexMcp.y - pinkyMcp.y) / palmScale
"""

import numpy as np
import json
import os

# Reproducibility
np.random.seed(42)

# ─────────────────────────────────────────────────────────────────────────────
# Gesture Feature Profiles
# Derived from the geometric rules in classifySingleHandInternal()
#
# Each gesture is defined as a dict with:
#   'id':   gesture identifier (matches JS code)
#   'name': human-readable name
#   'mean': 15-element list of mean feature values
#   'std':  15-element list of standard deviations (noise envelope)
#
# Feature index reference:
#   0: thumbExt, 1: indexExt, 2: middleExt, 3: ringExt, 4: pinkyExt
#   5: t2i, 6: t2m, 7: t2r, 8: t2p
#   9: i2m, 10: m2r, 11: r2p
#   12: thumbElev, 13: indexElev, 14: palmTilt
# ─────────────────────────────────────────────────────────────────────────────

GESTURE_PROFILES = [
    # ─── BASIC GESTURES ────────────────────────────────────────────────────
    {
        "id": "bunched", "name": "Bunched / Food",
        "mean": [0.55, 0.95, 0.95, 0.92, 0.88, 0.22, 0.24, 0.28, 0.32, 0.15, 0.15, 0.15, -0.10, -0.60, 0.05],
        "std":  [0.08, 0.06, 0.06, 0.06, 0.06, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.10, 0.12, 0.08],
    },
    {
        "id": "fingerheart", "name": "Finger Heart",
        "mean": [0.50, 0.92, 0.82, 0.78, 0.75, 0.20, 0.70, 0.85, 0.95, 0.55, 0.40, 0.35, -0.08, -0.50, 0.05],
        "std":  [0.08, 0.06, 0.05, 0.05, 0.05, 0.06, 0.08, 0.08, 0.08, 0.08, 0.06, 0.06, 0.10, 0.10, 0.08],
    },
    {
        "id": "pinch", "name": "Pinch / Little Bit",
        "mean": [0.52, 0.88, 0.82, 0.78, 0.75, 0.18, 0.65, 0.80, 0.92, 0.50, 0.38, 0.32, -0.05, -0.45, 0.05],
        "std":  [0.08, 0.05, 0.05, 0.05, 0.05, 0.04, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.10, 0.10, 0.08],
    },
    {
        "id": "crossed", "name": "Crossed Fingers",
        "mean": [0.55, 1.35, 1.32, 0.82, 0.78, 0.72, 0.68, 0.80, 0.90, 0.10, 0.42, 0.35, -0.05, -1.10, 0.05],
        "std":  [0.08, 0.08, 0.08, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.04, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "thumbsup", "name": "Thumbs Up (Yes)",
        "mean": [1.15, 0.85, 0.80, 0.78, 0.75, 0.95, 0.90, 0.85, 0.80, 0.30, 0.28, 0.25, -0.55, -0.20, 0.05],
        "std":  [0.10, 0.05, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.05, 0.05, 0.05, 0.12, 0.08, 0.08],
    },
    {
        "id": "thumbsdown", "name": "Thumbs Down (No)",
        "mean": [1.10, 0.85, 0.80, 0.78, 0.75, 0.92, 0.88, 0.82, 0.78, 0.30, 0.28, 0.25, 0.55, -0.20, 0.05],
        "std":  [0.10, 0.05, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.05, 0.05, 0.05, 0.12, 0.08, 0.08],
    },
    {
        "id": "letter_l", "name": "Letter L",
        "mean": [1.05, 1.38, 0.82, 0.78, 0.75, 0.90, 0.82, 0.78, 0.72, 0.52, 0.38, 0.32, -0.05, -1.20, 0.05],
        "std":  [0.10, 0.08, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.05, 0.12, 0.12, 0.08],
    },
    {
        "id": "ily", "name": "I Love You (ILY)",
        "mean": [1.05, 1.38, 0.82, 0.78, 1.28, 0.88, 0.80, 0.78, 0.55, 0.52, 0.38, 0.60, -0.15, -1.15, 0.05],
        "std":  [0.10, 0.08, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.08, 0.12, 0.12, 0.08],
    },
    {
        "id": "rock", "name": "Rock On / Horns",
        "mean": [0.52, 1.38, 0.82, 0.78, 1.28, 0.78, 0.72, 0.75, 0.55, 0.52, 0.38, 0.60, -0.05, -1.15, 0.05],
        "std":  [0.08, 0.08, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.08, 0.10, 0.12, 0.08],
    },
    {
        "id": "callme", "name": "Call Me / Shaka",
        "mean": [1.05, 0.85, 0.82, 0.78, 1.28, 0.82, 0.75, 0.72, 0.55, 0.40, 0.38, 0.55, -0.15, -0.30, 0.05],
        "std":  [0.10, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.08, 0.12, 0.08, 0.08],
    },
    {
        "id": "letter_i", "name": "Letter I (Pinky Only)",
        "mean": [0.52, 0.85, 0.82, 0.78, 1.28, 0.72, 0.68, 0.72, 0.55, 0.40, 0.38, 0.55, -0.05, -0.30, 0.05],
        "std":  [0.08, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.08, 0.10, 0.08, 0.08],
    },
    {
        "id": "ok", "name": "OK / Understood (ASL 9)",
        "mean": [0.65, 1.05, 1.35, 1.32, 1.25, 0.18, 0.62, 0.85, 0.95, 0.50, 0.42, 0.38, -0.10, -0.55, 0.05],
        "std":  [0.08, 0.06, 0.08, 0.08, 0.08, 0.04, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.10, 0.10, 0.08],
    },
    {
        "id": "num_eight", "name": "Number 8",
        "mean": [0.65, 1.35, 1.05, 1.32, 1.25, 0.62, 0.18, 0.85, 0.95, 0.50, 0.42, 0.38, -0.10, -1.05, 0.05],
        "std":  [0.08, 0.08, 0.06, 0.08, 0.08, 0.06, 0.04, 0.06, 0.06, 0.06, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "num_seven", "name": "Number 7",
        "mean": [0.65, 1.35, 1.35, 1.05, 1.25, 0.62, 0.58, 0.18, 0.95, 0.42, 0.42, 0.38, -0.10, -1.05, 0.05],
        "std":  [0.08, 0.08, 0.08, 0.06, 0.08, 0.06, 0.06, 0.04, 0.06, 0.05, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "num_six", "name": "Number 6",
        "mean": [0.65, 1.35, 1.35, 1.32, 1.05, 0.62, 0.58, 0.55, 0.18, 0.42, 0.42, 0.42, -0.10, -1.05, 0.05],
        "std":  [0.08, 0.08, 0.08, 0.08, 0.06, 0.06, 0.06, 0.06, 0.04, 0.05, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "peace", "name": "Peace / Two",
        "mean": [0.55, 1.38, 1.35, 0.82, 0.78, 0.72, 0.68, 0.80, 0.90, 0.38, 0.42, 0.35, -0.05, -1.10, 0.05],
        "std":  [0.08, 0.08, 0.08, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "letter_u", "name": "Letter U",
        "mean": [0.55, 1.38, 1.35, 0.82, 0.78, 0.72, 0.68, 0.80, 0.90, 0.14, 0.42, 0.35, -0.05, -1.10, 0.05],
        "std":  [0.08, 0.08, 0.08, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.04, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "num_three", "name": "Three / Letter W",
        "mean": [0.55, 1.38, 1.35, 1.32, 0.78, 0.72, 0.68, 0.62, 0.88, 0.38, 0.38, 0.42, -0.05, -1.10, 0.05],
        "std":  [0.08, 0.08, 0.08, 0.08, 0.05, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "wave", "name": "Wave / Open Palm",
        "mean": [1.00, 1.35, 1.32, 1.28, 1.22, 0.85, 0.90, 0.95, 1.00, 0.38, 0.35, 0.32, -0.12, -1.05, 0.05],
        "std":  [0.12, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.05, 0.12, 0.12, 0.08],
    },
    {
        "id": "num_four", "name": "Number 4",
        "mean": [0.42, 1.35, 1.32, 1.28, 1.22, 0.80, 0.85, 0.90, 0.95, 0.38, 0.35, 0.32, -0.05, -1.05, 0.05],
        "std":  [0.06, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.05, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "letter_b", "name": "Letter B",
        "mean": [0.42, 1.35, 1.32, 1.28, 1.22, 0.80, 0.85, 0.88, 0.92, 0.20, 0.18, 0.18, -0.05, -1.05, 0.05],
        "std":  [0.06, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.04, 0.04, 0.04, 0.10, 0.12, 0.08],
    },
    {
        "id": "palm", "name": "Flat Palm / Stop",
        "mean": [0.88, 1.35, 1.32, 1.28, 1.22, 0.82, 0.85, 0.90, 0.95, 0.35, 0.32, 0.30, -0.10, -1.05, 0.05],
        "std":  [0.12, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.05, 0.12, 0.12, 0.08],
    },
    {
        "id": "point", "name": "Pointing / One",
        "mean": [0.55, 1.38, 0.82, 0.78, 0.75, 0.72, 0.72, 0.78, 0.85, 0.52, 0.38, 0.32, -0.05, -1.20, 0.05],
        "std":  [0.08, 0.08, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.06, 0.05, 0.05, 0.10, 0.12, 0.08],
    },
    {
        "id": "letter_c", "name": "Letter C",
        "mean": [0.78, 1.05, 1.02, 0.98, 0.92, 0.58, 0.55, 0.58, 0.68, 0.30, 0.28, 0.28, -0.15, -0.62, 0.05],
        "std":  [0.10, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.12, 0.10, 0.08],
    },
    {
        "id": "letter_o", "name": "Letter O / Zero",
        "mean": [0.55, 0.92, 0.90, 0.88, 0.85, 0.22, 0.25, 0.30, 0.55, 0.22, 0.22, 0.22, -0.08, -0.50, 0.05],
        "std":  [0.08, 0.06, 0.06, 0.06, 0.06, 0.04, 0.04, 0.04, 0.08, 0.05, 0.05, 0.05, 0.10, 0.10, 0.08],
    },
    {
        "id": "letter_a", "name": "Letter A",
        "mean": [0.72, 0.82, 0.78, 0.75, 0.72, 0.55, 0.62, 0.68, 0.72, 0.28, 0.25, 0.22, -0.20, -0.25, 0.05],
        "std":  [0.10, 0.05, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08, 0.08, 0.05, 0.05, 0.05, 0.12, 0.08, 0.08],
    },
    {
        "id": "fist", "name": "Closed Fist",
        "mean": [0.45, 0.82, 0.78, 0.75, 0.72, 0.48, 0.52, 0.55, 0.58, 0.28, 0.25, 0.22, -0.02, -0.25, 0.05],
        "std":  [0.06, 0.05, 0.05, 0.05, 0.05, 0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.08, 0.08, 0.08],
    },
    # ─── ADDITIONAL "UNKNOWN" / AMBIGUOUS CLASS ─────────────────────────────
    # Random hand positions that don't match any gesture — teaches the model to reject noise
    {
        "id": "none", "name": "No Gesture / Unknown",
        "mean": [0.70, 1.05, 1.05, 1.02, 0.98, 0.60, 0.58, 0.60, 0.65, 0.32, 0.30, 0.28, -0.10, -0.60, 0.05],
        "std":  [0.25, 0.18, 0.18, 0.18, 0.18, 0.20, 0.20, 0.20, 0.20, 0.15, 0.15, 0.15, 0.25, 0.25, 0.15],
    },
]

# Number of samples to generate per gesture class
SAMPLES_PER_CLASS = 2000

# Additional augmentation: slight feature correlations (when one finger curls, neighbors tend to as well)
CORRELATION_GROUPS = [
    ([1, 2], 0.15),   # index-middle extension correlation
    ([2, 3], 0.20),   # middle-ring extension correlation
    ([3, 4], 0.15),   # ring-pinky extension correlation
    ([5, 6], 0.10),   # t2i-t2m pinch distance correlation
    ([6, 7], 0.10),   # t2m-t2r pinch distance correlation
    ([7, 8], 0.10),   # t2r-t2p pinch distance correlation
]


def generate_samples(profile: dict, n_samples: int) -> np.ndarray:
    """Generate synthetic samples for a single gesture class with correlated noise."""
    mean = np.array(profile["mean"], dtype=np.float32)
    std = np.array(profile["std"], dtype=np.float32)

    # Base Gaussian noise
    samples = np.random.normal(loc=mean, scale=std, size=(n_samples, 15)).astype(np.float32)

    # Add correlated perturbations between anatomically coupled features
    for indices, strength in CORRELATION_GROUPS:
        shared_noise = np.random.normal(0, strength, size=(n_samples, 1)).astype(np.float32)
        for idx in indices:
            samples[:, idx] += shared_noise.squeeze()

    # Clip to realistic ranges (no negative extension ratios)
    samples[:, 0] = np.clip(samples[:, 0], 0.15, 1.60)   # thumbExt
    samples[:, 1:5] = np.clip(samples[:, 1:5], 0.60, 1.70)  # finger ext ratios
    samples[:, 5:9] = np.clip(samples[:, 5:9], 0.05, 1.50)  # pinch distances
    samples[:, 9:12] = np.clip(samples[:, 9:12], 0.02, 1.00)  # inter-finger spreads
    samples[:, 12:15] = np.clip(samples[:, 12:15], -1.50, 1.50)  # orientations

    return samples


def generate_dataset():
    """Generate the full synthetic dataset with labels."""
    all_samples = []
    all_labels = []
    label_map = {}

    for label_idx, profile in enumerate(GESTURE_PROFILES):
        gesture_id = profile["id"]
        label_map[label_idx] = gesture_id
        print(f"  Generating {SAMPLES_PER_CLASS} samples for [{label_idx}] {gesture_id} ({profile['name']})")

        samples = generate_samples(profile, SAMPLES_PER_CLASS)
        labels = np.full(SAMPLES_PER_CLASS, label_idx, dtype=np.int32)

        all_samples.append(samples)
        all_labels.append(labels)

    X = np.vstack(all_samples)
    y = np.concatenate(all_labels)

    # Shuffle
    indices = np.random.permutation(len(X))
    X = X[indices]
    y = y[indices]

    return X, y, label_map


def main():
    output_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(output_dir, "data")
    os.makedirs(data_dir, exist_ok=True)

    print(f"Generating synthetic gesture data for {len(GESTURE_PROFILES)} classes...")
    print(f"Samples per class: {SAMPLES_PER_CLASS}")
    print(f"Total samples: {len(GESTURE_PROFILES) * SAMPLES_PER_CLASS}")
    print()

    X, y, label_map = generate_dataset()

    print(f"\nDataset shape: X={X.shape}, y={y.shape}")
    print(f"Classes: {len(label_map)}")

    # Save
    np.save(os.path.join(data_dir, "X_gesture.npy"), X)
    np.save(os.path.join(data_dir, "y_gesture.npy"), y)

    with open(os.path.join(data_dir, "label_map.json"), "w") as f:
        json.dump(label_map, f, indent=2)

    # Also save the inverse map (id -> label index) for frontend use
    id_to_label = {v: int(k) for k, v in label_map.items()}
    with open(os.path.join(data_dir, "id_to_label.json"), "w") as f:
        json.dump(id_to_label, f, indent=2)

    # Save class names list (ordered by label index)
    class_names = [label_map[i] for i in range(len(label_map))]
    with open(os.path.join(data_dir, "class_names.json"), "w") as f:
        json.dump(class_names, f, indent=2)

    print(f"\nSaved to {data_dir}/")
    print(f"  X_gesture.npy  ({X.nbytes / 1024:.1f} KB)")
    print(f"  y_gesture.npy  ({y.nbytes / 1024:.1f} KB)")
    print(f"  label_map.json")
    print(f"  id_to_label.json")
    print(f"  class_names.json")
    print(f"\nLabel mapping:")
    for idx, gesture_id in sorted(label_map.items()):
        print(f"  {idx:3d} -> {gesture_id}")


if __name__ == "__main__":
    main()
