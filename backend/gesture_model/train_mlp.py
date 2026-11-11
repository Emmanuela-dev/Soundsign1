"""
Train the Sound-Signs Gesture Neural Network Model.

Trains an MLP Neural Network (Input 15 -> Dense 128 -> Dense 64 -> Dense 32 -> Output 28)
using scikit-learn's MLPClassifier on the 56,000 synthetic landmark feature samples.

Exports:
  - model_weights.json: Full layer weights, biases, and metadata
  - norm_params.json: Feature scaler mean and scale
  - class_names.json: Ordered list of 28 gesture classes
  - model.json + group1-shard1of1.bin: Standard TensorFlow.js layers model format
  - Directly copies all artifacts to frontend/public/model/gesture_model/
"""

import os
import json
import struct
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, accuracy_score


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    project_root = os.path.dirname(os.path.dirname(base_dir))
    public_model_dir = os.path.join(project_root, "frontend", "public", "model", "gesture_model")
    os.makedirs(public_model_dir, exist_ok=True)

    print("=" * 60)
    print("SOUND-SIGNS GESTURE NEURAL NETWORK - TRAINING")
    print("=" * 60)

    # 1. Load Data
    X = np.load(os.path.join(data_dir, "X_gesture.npy"))
    y = np.load(os.path.join(data_dir, "y_gesture.npy"))

    with open(os.path.join(data_dir, "class_names.json"), "r") as f:
        class_names = json.load(f)

    print(f"Loaded {X.shape[0]} samples with {X.shape[1]} features across {len(class_names)} classes.")

    # 2. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    # 3. Standardize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 4. Neural Network Architecture: 15 -> 128 -> 64 -> 32 -> 28
    print("\nTraining Deep Neural Network (15 -> 128 -> 64 -> 32 -> 28)...")
    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32),
        activation="relu",
        solver="adam",
        alpha=0.0001,
        batch_size=128,
        learning_rate_init=0.002,
        max_iter=100,
        early_stopping=True,
        n_iter_no_change=10,
        validation_fraction=0.15,
        random_state=42,
        verbose=True,
    )

    mlp.fit(X_train_scaled, y_train)

    # 5. Evaluate
    y_pred = mlp.predict(X_test_scaled)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest Accuracy: {acc * 100:.2f}%")

    print("\nClassification Report (Sample):")
    print(classification_report(y_test, y_pred, target_names=class_names, digits=3))

    # 6. Extract Weights and Biases
    # mlp.coefs_ has shapes: [(15, 128), (128, 64), (64, 32), (32, 28)]
    # mlp.intercepts_ has shapes: [(128,), (64,), (32,), (28,)]
    layers_data = []
    total_params = 0
    raw_weights_bytes = bytearray()

    weight_manifest_weights = []

    for idx, (w, b) in enumerate(zip(mlp.coefs_, mlp.intercepts_)):
        w_f32 = w.astype(np.float32)
        b_f32 = b.astype(np.float32)
        total_params += w_f32.size + b_f32.size

        layers_data.append({
            "layer_index": idx,
            "kernel_shape": list(w_f32.shape),
            "bias_shape": list(b_f32.shape),
            "weights": w_f32.tolist(),
            "biases": b_f32.tolist(),
        })

        # Pack into binary format for TF.js compatibility
        raw_weights_bytes.extend(w_f32.tobytes())
        raw_weights_bytes.extend(b_f32.tobytes())

        layer_name = f"dense_{idx + 1}"
        weight_manifest_weights.extend([
            {
                "name": f"{layer_name}/kernel",
                "shape": list(w_f32.shape),
                "dtype": "float32",
            },
            {
                "name": f"{layer_name}/bias",
                "shape": list(b_f32.shape),
                "dtype": "float32",
            },
        ])

    print(f"\nTotal Neural Network Parameters: {total_params:,}")

    # 7. Export normalization parameters
    norm_params = {
        "mean": scaler.mean_.tolist(),
        "std": scaler.scale_.tolist(),
    }

    # 8. Export TF.js Layers Model Topology (model.json)
    tfjs_topology = {
        "format": "layers-model",
        "generatedBy": "Sound-Signs Gesture AI Trainer",
        "convertedBy": None,
        "modelTopology": {
            "class_name": "Sequential",
            "config": {
                "name": "sound_signs_gesture_net",
                "layers": [
                    {
                        "class_name": "InputLayer",
                        "config": {"batch_input_shape": [None, 15], "dtype": "float32", "name": "input_15"},
                    },
                    {
                        "class_name": "Dense",
                        "config": {"name": "dense_1", "units": 128, "activation": "relu", "use_bias": True},
                    },
                    {
                        "class_name": "Dense",
                        "config": {"name": "dense_2", "units": 64, "activation": "relu", "use_bias": True},
                    },
                    {
                        "class_name": "Dense",
                        "config": {"name": "dense_3", "units": 32, "activation": "relu", "use_bias": True},
                    },
                    {
                        "class_name": "Dense",
                        "config": {"name": "dense_4", "units": len(class_names), "activation": "softmax", "use_bias": True},
                    },
                ],
            },
        },
        "weightsManifest": [
            {
                "paths": ["group1-shard1of1.bin"],
                "weights": weight_manifest_weights,
            }
        ],
    }

    # 9. Save Files into frontend/public/model/gesture_model/ and backend/gesture_model/data/
    target_dirs = [data_dir, public_model_dir]

    for d in target_dirs:
        os.makedirs(d, exist_ok=True)

        # 1. model_weights.json (Lightweight standalone weights for microsecond JS inference)
        with open(os.path.join(d, "model_weights.json"), "w") as f:
            json.dump({
                "model_name": "sound_signs_gesture_mlp",
                "accuracy": float(acc),
                "num_classes": len(class_names),
                "class_names": class_names,
                "norm_params": norm_params,
                "layers": layers_data,
            }, f)

        # 2. norm_params.json
        with open(os.path.join(d, "norm_params.json"), "w") as f:
            json.dump(norm_params, f, indent=2)

        # 3. class_names.json
        with open(os.path.join(d, "class_names.json"), "w") as f:
            json.dump(class_names, f, indent=2)

        # 4. model.json (TF.js format)
        with open(os.path.join(d, "model.json"), "w") as f:
            json.dump(tfjs_topology, f, indent=2)

        # 5. group1-shard1of1.bin (TF.js binary weight shard)
        with open(os.path.join(d, "group1-shard1of1.bin"), "wb") as f:
            f.write(raw_weights_bytes)

    print("\n" + "=" * 60)
    print("ALL MODEL ARTIFACTS EXPORTED SUCCESSFULLY")
    print("=" * 60)
    for f in os.listdir(public_model_dir):
        fpath = os.path.join(public_model_dir, f)
        print(f"  {f:30s} {os.path.getsize(fpath):>10,} bytes")
    print(f"\nDestination: {public_model_dir}")


if __name__ == "__main__":
    main()
