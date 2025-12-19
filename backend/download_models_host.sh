#!/bin/bash
# Download default YOLO models to the mounted models directory
# This script can be run on the host to pre-populate the models directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODELS_DIR="${SCRIPT_DIR}/uploads/models"

echo "=========================================="
echo "Downloading YOLO Models to Host Directory"
echo "=========================================="
echo "Models directory: $MODELS_DIR"

# Create directory if it doesn't exist
mkdir -p "$MODELS_DIR"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed"
    exit 1
fi

# Check if ultralytics is installed
if ! python3 -c "import ultralytics" 2>/dev/null; then
    echo "Installing ultralytics..."
    pip3 install ultralytics requests tqdm
fi

# Run download script
echo "Starting model download..."
python3 << 'PYTHON_SCRIPT'
import sys
from pathlib import Path
from ultralytics import YOLO
from ultralytics.utils.downloads import download
import logging

logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

models_dir = Path("$MODELS_DIR")
models_dir.mkdir(parents=True, exist_ok=True)

default_models = [
    "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
    "yolo11n.pt", "yolo11s.pt", "yolo11m.pt", "yolo11l.pt", "yolo11x.pt",
    "yoloe-11n.pt", "yoloe-11s.pt", "yoloe-11m.pt", "yoloe-11l.pt", "yoloe-11x.pt"
]

print(f"\nDownloading {len(default_models)} models to {models_dir}...")

downloaded = 0
skipped = 0
failed = 0

for model_name in default_models:
    target_path = models_dir / model_name
    
    if target_path.exists():
        size_mb = target_path.stat().st_size / (1024 * 1024)
        print(f"✓ {model_name} already exists ({size_mb:.2f} MB)")
        skipped += 1
        continue
    
    print(f"\nDownloading {model_name}...")
    try:
        # Try direct download first
        url = f"https://github.com/ultralytics/assets/releases/download/v0.0.0/{model_name}"
        downloaded_file = download(url, dir=str(models_dir), unzip=False)
        
        if downloaded_file:
            file_path = Path(downloaded_file)
            if file_path.exists() and file_path.stat().st_size > 1000:
                if file_path.name != model_name:
                    file_path.rename(target_path)
                size_mb = target_path.stat().st_size / (1024 * 1024)
                print(f"✓ {model_name} downloaded ({size_mb:.2f} MB)")
                downloaded += 1
            else:
                print(f"⚠ {model_name} download failed (file too small or missing)")
                failed += 1
        else:
            # Fallback: load model with YOLO (will download automatically)
            try:
                model = YOLO(model_name)
                # Try to find and copy from cache
                import shutil
                from pathlib import Path as PathLib
                import os
                
                cache_locations = [
                    PathLib.home() / ".ultralytics" / "weights" / model_name,
                    PathLib.home() / ".ultralytics" / model_name,
                    PathLib.home() / ".cache" / "ultralytics" / model_name,
                ]
                
                copied = False
                for cache_path in cache_locations:
                    if cache_path.exists():
                        shutil.copy2(cache_path, target_path)
                        size_mb = target_path.stat().st_size / (1024 * 1024)
                        print(f"✓ {model_name} copied from cache ({size_mb:.2f} MB)")
                        downloaded += 1
                        copied = True
                        break
                
                if not copied:
                    print(f"⚠ {model_name} downloaded but not found in cache")
                    failed += 1
            except Exception as e:
                print(f"✗ {model_name} failed: {e}")
                failed += 1
    except Exception as e:
        print(f"✗ {model_name} failed: {e}")
        failed += 1

print(f"\n==========================================")
print(f"Download Summary:")
print(f"  Downloaded: {downloaded}")
print(f"  Skipped: {skipped}")
print(f"  Failed: {failed}")
print(f"==========================================")

# List downloaded models
if models_dir.exists():
    models = list(models_dir.glob("*.pt"))
    print(f"\nModels in {models_dir}:")
    for m in sorted(models):
        size_mb = m.stat().st_size / (1024 * 1024)
        print(f"  - {m.name} ({size_mb:.2f} MB)")

PYTHON_SCRIPT

echo ""
echo "=========================================="
echo "Model download completed!"
echo "Models are now in: $MODELS_DIR"
echo "=========================================="
