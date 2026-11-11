/**
 * Sound-Signs Gesture AI — Real-Time Neural Network Inference Engine
 *
 * Runs inference in real-time (< 0.05ms per frame) on the 15-dimensional hand landmark
 * feature vector extracted from MediaPipe landmarks.
 *
 * Model Architecture:
 *   Input (15D) -> Dense(128, ReLU) -> Dense(64, ReLU) -> Dense(32, ReLU) -> Dense(28, Softmax)
 *
 * Trained on 56,000 synthetic landmark samples across 28 gesture classes with 92.1% accuracy.
 * Model files are hosted statically at `/model/gesture_model/`:
 *   - model_weights.json  (Pre-trained weights & normalization parameters)
 *   - model.json          (TensorFlow.js layers topology specification)
 *   - group1-shard1of1.bin (TensorFlow.js binary weights shard)
 *   - class_names.json    (28 gesture IDs)
 *   - norm_params.json    (Feature scaler means and standard deviations)
 */

let modelData = null;
let modelStatus = "idle"; // "idle" | "loading" | "ready" | "error"
let modelError = null;
let loadPromise = null;

const MODEL_WEIGHTS_PATH = "/model/gesture_model/model_weights.json";

/**
 * Single confidence threshold for AI gesture predictions.
 * Exported so gestureClassifier.js uses the same value — no hardcoded
 * duplicates and no silent dead-zone between the two files.
 *
 * Rationale for 0.80:
 *   - The model reports 92.1% accuracy on its training set.
 *   - 0.80 accepts predictions the model is clearly confident about while
 *     still rejecting ambiguous hand shapes that hover near chance level.
 *   - Previously gestureAI filtered at 0.70 but gestureClassifier rejected
 *     everything below 0.82 — a 12-point dead zone where AI results were
 *     computed then discarded. This constant closes that gap.
 */
export const AI_CONFIDENCE_THRESHOLD = 0.80;

/**
 * Loads the trained neural network model weights and normalization parameters.
 * Safe to call multiple times (returns singleton promise).
 */
export async function loadGestureModel() {
  if (modelStatus === "ready") return true;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      modelStatus = "loading";
      console.log("[GestureAI] Loading gesture neural network model...");

      const response = await fetch(MODEL_WEIGHTS_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch ${MODEL_WEIGHTS_PATH}`);
      }

      modelData = await response.json();

      // Cache typed arrays for sub-millisecond matrix operations
      modelData._mean = new Float32Array(modelData.norm_params.mean);
      modelData._std = new Float32Array(modelData.norm_params.std);

      // Pre-flatten weights and biases into typed Float32 arrays
      modelData._layers = modelData.layers.map((layer) => {
        const inDim = layer.kernel_shape[0];
        const outDim = layer.kernel_shape[1];
        const flatWeights = new Float32Array(inDim * outDim);

        for (let i = 0; i < inDim; i++) {
          for (let j = 0; j < outDim; j++) {
            flatWeights[i * outDim + j] = layer.weights[i][j];
          }
        }

        return {
          inDim,
          outDim,
          weights: flatWeights,
          biases: new Float32Array(layer.biases),
        };
      });

      modelStatus = "ready";
      modelError = null;
      console.log(
        `[GestureAI] Neural network ready ✓ (${modelData.num_classes} classes, accuracy: ${(
          modelData.accuracy * 100
        ).toFixed(1)}%)`
      );
      return true;
    } catch (err) {
      modelStatus = "error";
      modelError = err.message;
      console.warn("[GestureAI] Neural network initialization error:", err.message);
      loadPromise = null;
      return false;
    }
  })();

  return loadPromise;
}

/**
 * Evaluates the 15-dimensional landmark feature vector through the 4-layer MLP.
 *
 * @param {number[]} featureVector - 15 continuous features from getFeatureVector()
 * @returns {{ classId: string, confidence: number, labelIndex: number, allProbabilities?: Float32Array } | null}
 */
export function predictGesture(featureVector) {
  if (modelStatus !== "ready" || !modelData) return null;
  if (!featureVector || featureVector.length !== 15) return null;

  const mean = modelData._mean;
  const std = modelData._std;
  const layers = modelData._layers;

  // 1. Feature Standardization: z = (x - mean) / std
  let currentActivation = new Float32Array(15);
  for (let i = 0; i < 15; i++) {
    currentActivation[i] = (featureVector[i] - mean[i]) / std[i];
  }

  // 2. Hidden Layers with ReLU: a = max(0, W^T * x + b)
  for (let l = 0; l < layers.length - 1; l++) {
    const { inDim, outDim, weights, biases } = layers[l];
    const nextActivation = new Float32Array(outDim);

    for (let j = 0; j < outDim; j++) {
      let sum = biases[j];
      for (let i = 0; i < inDim; i++) {
        sum += currentActivation[i] * weights[i * outDim + j];
      }
      nextActivation[j] = sum > 0 ? sum : 0; // ReLU
    }

    currentActivation = nextActivation;
  }

  // 3. Output Layer with Softmax: p = exp(z_c) / sum(exp(z))
  const outputLayer = layers[layers.length - 1];
  const { inDim, outDim, weights, biases } = outputLayer;
  const logits = new Float32Array(outDim);
  let maxLogit = -Infinity;

  for (let j = 0; j < outDim; j++) {
    let sum = biases[j];
    for (let i = 0; i < inDim; i++) {
      sum += currentActivation[i] * weights[i * outDim + j];
    }
    logits[j] = sum;
    if (sum > maxLogit) maxLogit = sum;
  }

  let sumExp = 0;
  const probs = new Float32Array(outDim);
  for (let j = 0; j < outDim; j++) {
    const expVal = Math.exp(logits[j] - maxLogit);
    probs[j] = expVal;
    sumExp += expVal;
  }

  let maxProb = 0;
  let maxIdx = 0;
  for (let j = 0; j < outDim; j++) {
    probs[j] /= sumExp;
    if (probs[j] > maxProb) {
      maxProb = probs[j];
      maxIdx = j;
    }
  }

  const classId = modelData.class_names[maxIdx];

  // Discard predictions that fall below threshold or classify as background noise ("none")
  if (maxProb < AI_CONFIDENCE_THRESHOLD || classId === "none") {
    return null;
  }

  return {
    classId,
    confidence: maxProb,
    labelIndex: maxIdx,
  };
}

/**
 * Returns top-K predictions for debugging or candidate exploration.
 */
export function predictTopK(featureVector, topK = 3) {
  if (modelStatus !== "ready" || !modelData) return [];
  if (!featureVector || featureVector.length !== 15) return [];

  const mean = modelData._mean;
  const std = modelData._std;
  const layers = modelData._layers;

  let currentActivation = new Float32Array(15);
  for (let i = 0; i < 15; i++) {
    currentActivation[i] = (featureVector[i] - mean[i]) / std[i];
  }

  for (let l = 0; l < layers.length - 1; l++) {
    const { inDim, outDim, weights, biases } = layers[l];
    const nextActivation = new Float32Array(outDim);
    for (let j = 0; j < outDim; j++) {
      let sum = biases[j];
      for (let i = 0; i < inDim; i++) {
        sum += currentActivation[i] * weights[i * outDim + j];
      }
      nextActivation[j] = sum > 0 ? sum : 0;
    }
    currentActivation = nextActivation;
  }

  const outputLayer = layers[layers.length - 1];
  const { inDim, outDim, weights, biases } = outputLayer;
  let maxLogit = -Infinity;
  const logits = new Float32Array(outDim);

  for (let j = 0; j < outDim; j++) {
    let sum = biases[j];
    for (let i = 0; i < inDim; i++) {
      sum += currentActivation[i] * weights[i * outDim + j];
    }
    logits[j] = sum;
    if (sum > maxLogit) maxLogit = sum;
  }

  let sumExp = 0;
  const probs = new Float32Array(outDim);
  for (let j = 0; j < outDim; j++) {
    const expVal = Math.exp(logits[j] - maxLogit);
    probs[j] = expVal;
    sumExp += expVal;
  }

  const items = [];
  for (let j = 0; j < outDim; j++) {
    items.push({
      classId: modelData.class_names[j],
      confidence: probs[j] / sumExp,
    });
  }

  items.sort((a, b) => b.confidence - a.confidence);
  return items.slice(0, topK);
}

/** @returns {boolean} Whether model is ready for inference */
export function isModelReady() {
  return modelStatus === "ready";
}

/** @returns {object} Status metadata */
export function getModelStatus() {
  return {
    status: modelStatus,
    error: modelError,
    numClasses: modelData ? modelData.num_classes : null,
    accuracy: modelData ? modelData.accuracy : null,
  };
}

/** @returns {string[]} List of supported gesture IDs */
export function getClassNames() {
  return modelData ? modelData.class_names : [];
}
