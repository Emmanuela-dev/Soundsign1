"""
Export the trained gesture model to TensorFlow.js format for browser inference.

Converts the SavedModel to TF.js Layers format, outputting:
  - model.json       (model topology)
  - group1-shard*.bin (weight data)
  - class_names.json  (label index → gesture ID mapping)
  - norm_params.json  (feature normalization parameters)

Output directory: frontend/public/model/gesture_model/
"""

import os
import json
import shutil

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"


def export_tfjs():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    saved_model_dir = os.path.join(data_dir, "gesture_model_saved")

    # Output to frontend public directory
    project_root = os.path.dirname(os.path.dirname(base_dir))
    tfjs_output_dir = os.path.join(project_root, "frontend", "public", "model", "gesture_model")
    os.makedirs(tfjs_output_dir, exist_ok=True)

    if not os.path.exists(saved_model_dir):
        print("ERROR: Saved model not found. Run train.py first!")
        return

    print("=" * 60)
    print("EXPORTING TO TENSORFLOW.JS")
    print("=" * 60)
    print(f"Source: {saved_model_dir}")
    print(f"Target: {tfjs_output_dir}")
    print()

    # Use tensorflowjs_converter
    try:
        import tensorflowjs as tfjs
        import tensorflow as tf

        print("Loading saved model...")
        model = tf.keras.models.load_model(saved_model_dir)
        model.summary()

        print(f"\nConverting to TF.js Layers format...")
        tfjs.converters.save_keras_model(model, tfjs_output_dir)
        print(f"✓ TF.js model saved to {tfjs_output_dir}")

    except ImportError:
        # Fallback: use CLI converter
        print("tensorflowjs Python API not available, using CLI converter...")
        import subprocess
        result = subprocess.run([
            "tensorflowjs_converter",
            "--input_format=tf_saved_model",
            "--output_format=tfjs_layers_model",
            "--signature_name=serving_default",
            saved_model_dir,
            tfjs_output_dir,
        ], capture_output=True, text=True)

        if result.returncode != 0:
            print(f"ERROR: Conversion failed!\n{result.stderr}")
            return
        print(f"✓ TF.js model saved to {tfjs_output_dir}")

    # Copy class_names.json and norm_params.json to the output directory
    for filename in ["class_names.json", "norm_params.json"]:
        src = os.path.join(data_dir, filename)
        dst = os.path.join(tfjs_output_dir, filename)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"✓ Copied {filename}")
        else:
            print(f"WARNING: {filename} not found in {data_dir}")

    # List output files
    print(f"\nOutput files in {tfjs_output_dir}:")
    total_size = 0
    for f in sorted(os.listdir(tfjs_output_dir)):
        fpath = os.path.join(tfjs_output_dir, f)
        size = os.path.getsize(fpath)
        total_size += size
        print(f"  {f:40s} {size:>10,} bytes")
    print(f"  {'TOTAL':40s} {total_size:>10,} bytes ({total_size / 1024:.1f} KB)")

    print(f"\n✓ Export complete! Model ready for browser inference.")
    print(f"  Load in JS: tf.loadLayersModel('/model/gesture_model/model.json')")


if __name__ == "__main__":
    export_tfjs()
