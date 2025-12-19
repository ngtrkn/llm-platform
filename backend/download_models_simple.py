#!/usr/bin/env python3
"""
Simple script to download YOLO models directly using requests.
Can run without ultralytics installed.
"""

import sys
import os
from pathlib import Path
import requests

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

def get_default_models():
    """Get list of default models"""
    return [
        "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
        "yolo11n.pt", "yolo11s.pt", "yolo11m.pt", "yolo11l.pt", "yolo11x.pt",
        "yoloe-11n.pt", "yoloe-11s.pt", "yoloe-11m.pt", "yoloe-11l.pt", "yoloe-11x.pt"
    ]

def download_model(url, target_path):
    """Download a model file from URL"""
    try:
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        downloaded = 0
        with open(target_path, 'wb') as f:
            if HAS_TQDM and total_size > 0:
                with tqdm(total=total_size, unit='B', unit_scale=True, desc=target_path.name) as pbar:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            pbar.update(len(chunk))
                            downloaded += len(chunk)
            else:
                print(f"  Downloading {target_path.name}...", end='', flush=True)
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                print(" Done")
        
        return target_path.exists() and target_path.stat().st_size > 1000
    except Exception as e:
        print(f"Error downloading {target_path.name}: {e}")
        return False

def download_with_ultralytics(model_name, target_path):
    """Download model using Ultralytics (for YOLOv11 and YOLOE)"""
    try:
        from ultralytics import YOLO
        from ultralytics.utils.downloads import download
        import shutil
        
        # Try direct download first
        url = f"https://github.com/ultralytics/assets/releases/download/v0.0.0/{model_name}"
        try:
            downloaded_file = download(url, dir=str(target_path.parent), unzip=False)
            if downloaded_file and Path(downloaded_file).exists():
                file_path = Path(downloaded_file)
                if file_path.name != model_name:
                    file_path.rename(target_path)
                return target_path.exists()
        except:
            pass
        
        # Fallback: Load with YOLO (downloads automatically)
        model = YOLO(model_name)
        
        # Find downloaded file in cache
        import os
        cache_dirs = [
            Path.home() / ".ultralytics" / "weights",
            Path.home() / ".ultralytics",
            Path.home() / ".cache" / "ultralytics",
        ]
        
        for cache_dir in cache_dirs:
            if cache_dir.exists():
                for root, dirs, files in os.walk(cache_dir):
                    if model_name in files:
                        source = Path(root) / model_name
                        shutil.copy2(source, target_path)
                        return True
        
        return False
    except Exception as e:
        print(f"  Ultralytics download error: {e}")
        return False

def main():
    if len(sys.argv) > 1:
        models_dir = Path(sys.argv[1])
    else:
        models_dir = Path(__file__).parent / "uploads" / "models"
    
    models_dir.mkdir(parents=True, exist_ok=True)
    
    print("=" * 70)
    print("Downloading YOLO Models")
    print(f"Target directory: {models_dir}")
    print("=" * 70)
    
    default_models = get_default_models()
    base_url = "https://github.com/ultralytics/assets/releases/download/v0.0.0"
    
    # Models that work with direct download
    direct_download_models = ["yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt"]
    
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
        
        # Try direct download for YOLOv8
        if model_name in direct_download_models:
            url = f"{base_url}/{model_name}"
            if download_model(url, target_path):
                size_mb = target_path.stat().st_size / (1024 * 1024)
                print(f"✓ {model_name} downloaded ({size_mb:.2f} MB)")
                downloaded += 1
            else:
                print(f"✗ {model_name} failed")
                failed += 1
        else:
            # Use Ultralytics for YOLOv11 and YOLOE
            print(f"  Using Ultralytics for {model_name}...")
            if download_with_ultralytics(model_name, target_path):
                if target_path.exists():
                    size_mb = target_path.stat().st_size / (1024 * 1024)
                    print(f"✓ {model_name} downloaded ({size_mb:.2f} MB)")
                    downloaded += 1
                else:
                    print(f"✗ {model_name} download completed but file not found")
                    failed += 1
            else:
                print(f"✗ {model_name} failed (may need Ultralytics installed)")
                failed += 1
    
    print("\n" + "=" * 70)
    print(f"Summary: {downloaded} downloaded, {skipped} skipped, {failed} failed")
    
    # List downloaded models
    models = list(models_dir.glob("*.pt"))
    if models:
        print(f"\nModels in {models_dir}:")
        for m in sorted(models):
            size_mb = m.stat().st_size / (1024 * 1024)
            print(f"  - {m.name} ({size_mb:.2f} MB)")
    
    print("=" * 70)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
