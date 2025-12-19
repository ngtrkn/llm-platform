#!/usr/bin/env python3
"""
Download default YOLO models and save them to the models directory.
This script runs during container initialization to ensure models are available.
"""

import sys
import os
from pathlib import Path
from ultralytics import YOLO
import logging
import shutil
import torch
import requests
from tqdm import tqdm

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    force=True
)
logger = logging.getLogger(__name__)


def get_default_models():
    """Get list of default models"""
    return [
        "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
        "yolo11n.pt", "yolo11s.pt", "yolo11m.pt", "yolo11l.pt", "yolo11x.pt",
        "yoloe-11n.pt", "yoloe-11s.pt", "yoloe-11m.pt", "yoloe-11l.pt", "yoloe-11x.pt"
    ]


def download_models(models_dir: Path):
    """Download all default models to the models directory"""
    models_dir.mkdir(parents=True, exist_ok=True)
    
    default_models = get_default_models()
    
    logger.info("=" * 70)
    logger.info("Downloading default YOLO models...")
    logger.info(f"Target directory: {models_dir}")
    logger.info(f"Models to download: {len(default_models)}")
    logger.info("=" * 70)
    
    downloaded_count = 0
    skipped_count = 0
    failed_count = 0
    
    for model_name in default_models:
        try:
            target_path = models_dir / model_name
            
            # Skip if already exists
            if target_path.exists():
                size_mb = target_path.stat().st_size / (1024 * 1024)
                logger.info(f"✓ {model_name} already exists ({size_mb:.2f} MB)")
                skipped_count += 1
                continue
            
            logger.info(f"\n--- Downloading {model_name} ---")
            
            # Method 1: Use Ultralytics download utility (handles all model types correctly)
            # According to ultralytics/utils/downloads.py, the download function can handle model names
            saved = False
            try:
                logger.info(f"Attempting Ultralytics download for {model_name}...")
                from ultralytics.utils.downloads import download
                
                # Try 1: Pass model name directly - Ultralytics will construct correct URL
                try:
                    logger.info(f"Calling download('{model_name}')...")
                    downloaded_file = download(model_name, dir=str(models_dir), unzip=False)
                    if downloaded_file:
                        file_path = Path(downloaded_file)
                        logger.info(f"Download returned: {file_path}")
                        if file_path.exists() and file_path.stat().st_size > 1000:
                            # Ensure correct filename
                            if file_path.name != model_name:
                                logger.info(f"Renaming {file_path.name} to {model_name}")
                                file_path.rename(target_path)
                            elif file_path != target_path:
                                shutil.copy2(file_path, target_path)
                            
                            if target_path.exists():
                                size_mb = target_path.stat().st_size / (1024 * 1024)
                                logger.info(f"✓✓ Ultralytics download successful ({size_mb:.2f} MB)")
                                saved = True
                                downloaded_count += 1
                                continue
                except Exception as e1:
                    logger.warning(f"Direct model name download failed: {e1}")
                    import traceback
                    logger.debug(traceback.format_exc())
                
                # Try 2: Explicit URL (for models that need it)
                if not saved:
                    urls_to_try = [
                        f"https://github.com/ultralytics/assets/releases/download/v0.0.0/{model_name}",
                        f"https://github.com/ultralytics/assets/releases/download/v8.2.0/{model_name}",
                        f"https://github.com/ultralytics/assets/releases/download/v8.3.0/{model_name}",
                    ]
                    
                    for url in urls_to_try:
                        try:
                            logger.info(f"Trying explicit URL: {url}")
                            downloaded_file = download(url, dir=str(models_dir), unzip=False)
                            if downloaded_file:
                                file_path = Path(downloaded_file)
                                if file_path.exists() and file_path.stat().st_size > 1000:
                                    if file_path.name != model_name:
                                        file_path.rename(target_path)
                                    elif file_path != target_path:
                                        shutil.copy2(file_path, target_path)
                                    if target_path.exists():
                                        size_mb = target_path.stat().st_size / (1024 * 1024)
                                        logger.info(f"✓✓ URL download successful ({size_mb:.2f} MB)")
                                        saved = True
                                        downloaded_count += 1
                                        break
                        except Exception as url_error:
                            logger.debug(f"URL {url} failed: {url_error}")
                            continue
                
                if saved:
                    continue
            except Exception as e:
                logger.warning(f"Ultralytics download utility failed: {e}")
                import traceback
                logger.debug(traceback.format_exc())
            
            # Method 2: Load model with YOLO (which downloads it automatically) then copy from cache
            # This is the most reliable method as Ultralytics handles all model types
            if not saved:
                actual_model_name = model_name
                model = None
                
                logger.info(f"Loading model with YOLO (will auto-download): {model_name}")
                
                # For YOLOE models, try both naming conventions
                if "yoloe-11" in model_name:
                    try:
                        model = YOLO(model_name)
                        logger.info(f"✓ Successfully loaded {model_name}")
                    except Exception as e1:
                        logger.warning(f"Failed with {model_name}: {e1}")
                        alt_name = model_name.replace("yoloe-11", "yoloe11")
                        logger.info(f"Trying alternative: {alt_name}")
                        try:
                            model = YOLO(alt_name)
                            actual_model_name = alt_name
                            logger.info(f"✓ Successfully loaded {alt_name}")
                        except Exception as e2:
                            logger.error(f"Both failed: {e1}, {e2}")
                            failed_count += 1
                            continue
                else:
                    try:
                        model = YOLO(model_name)
                        logger.info(f"✓ Successfully loaded {model_name}")
                    except Exception as e:
                        logger.error(f"Failed to load {model_name}: {e}")
                        failed_count += 1
                        continue
                
                if model is None:
                    failed_count += 1
                    continue
            
            # Find and copy the model file
            saved = False
            
            # Method 1: Check ckpt_path attribute (most reliable - YOLO stores downloaded model here)
            try:
                # YOLO stores the model file path in ckpt_path after loading
                if hasattr(model, 'ckpt_path') and model.ckpt_path:
                    ckpt = Path(model.ckpt_path)
                    logger.info(f"Model ckpt_path: {ckpt}")
                    if ckpt.exists():
                        shutil.copy2(ckpt, target_path)
                        size_mb = target_path.stat().st_size / (1024 * 1024)
                        logger.info(f"✓ Copied from ckpt_path ({size_mb:.2f} MB)")
                        saved = True
                    else:
                        logger.warning(f"ckpt_path doesn't exist: {ckpt}")
                # Also check weights attribute
                elif hasattr(model, 'weights') and model.weights:
                    weights = Path(model.weights)
                    logger.info(f"Model weights: {weights}")
                    if weights.exists():
                        shutil.copy2(weights, target_path)
                        size_mb = target_path.stat().st_size / (1024 * 1024)
                        logger.info(f"✓ Copied from weights ({size_mb:.2f} MB)")
                        saved = True
            except Exception as e:
                logger.warning(f"Error checking model path attributes: {e}")
                import traceback
                logger.debug(traceback.format_exc())
            
            # Method 2: Check weights attribute
            if not saved:
                try:
                    if hasattr(model, 'weights') and model.weights:
                        weights = Path(model.weights)
                        logger.info(f"Checking weights: {weights}")
                        if weights.exists():
                            shutil.copy2(weights, target_path)
                            logger.info(f"✓ Copied from weights: {weights}")
                            saved = True
                except Exception as e:
                    logger.warning(f"Error checking weights: {e}")
            
            # Method 3: Check Ultralytics cache directories
            if not saved:
                import os
                cache_locations = [
                    Path.home() / ".ultralytics" / "weights" / actual_model_name,
                    Path.home() / ".ultralytics" / actual_model_name,
                    Path.home() / ".cache" / "ultralytics" / actual_model_name,
                    Path("/root/.ultralytics/weights") / actual_model_name,
                    Path("/root/.ultralytics") / actual_model_name,
                ]
                
                logger.info(f"Searching cache locations for {actual_model_name}...")
                for cache_path in cache_locations:
                    logger.info(f"  Checking: {cache_path}")
                    if cache_path.exists():
                        shutil.copy2(cache_path, target_path)
                        logger.info(f"✓ Copied from cache: {cache_path}")
                        saved = True
                        break
            
            # Method 4: Recursive search in Ultralytics directories
            if not saved:
                search_dirs = [
                    Path.home() / ".ultralytics",
                    Path.home() / ".cache" / "ultralytics",
                    Path("/root/.ultralytics"),
                ]
                
                logger.info(f"Recursively searching for {actual_model_name}...")
                for search_dir in search_dirs:
                    if search_dir.exists():
                        logger.info(f"  Searching in: {search_dir}")
                        try:
                            for root, dirs, files in os.walk(search_dir):
                                if actual_model_name in files:
                                    source_file = Path(root) / actual_model_name
                                    shutil.copy2(source_file, target_path)
                                    logger.info(f"✓ Found and copied from {source_file}")
                                    saved = True
                                    break
                            if saved:
                                break
                        except Exception as e:
                            logger.warning(f"Error searching {search_dir}: {e}")
            
            # Method 5: Try to get the file path from model's _check_yolov8 method or similar
            if not saved:
                try:
                    # Check if model has a way to get the file path
                    if hasattr(model, 'model') and hasattr(model.model, 'yaml_file'):
                        yaml_file = Path(model.model.yaml_file) if model.model.yaml_file else None
                        if yaml_file and yaml_file.exists():
                            # Look for corresponding .pt file
                            pt_file = yaml_file.with_suffix('.pt')
                            if pt_file.exists():
                                shutil.copy2(pt_file, target_path)
                                logger.info(f"✓ Copied from yaml_file location: {pt_file}")
                                saved = True
                except Exception as e:
                    logger.debug(f"Error checking yaml_file: {e}")
            
            # Method 6: Save model directly using torch (last resort)
            if not saved:
                try:
                    logger.info("Attempting to save model directly...")
                    if hasattr(model, 'model'):
                        # Save the entire model
                        torch.save(model.model, target_path)
                        logger.info(f"✓ Saved model directly to {target_path}")
                        saved = True
                    elif hasattr(model, 'ckpt') and model.ckpt:
                        # Save checkpoint
                        torch.save(model.ckpt, target_path)
                        logger.info(f"✓ Saved checkpoint to {target_path}")
                        saved = True
                except Exception as e:
                    logger.warning(f"Could not save model directly: {e}")
            
            # Method 7: Download directly from Ultralytics GitHub releases
            if not saved:
                try:
                    logger.info("Attempting direct download from Ultralytics GitHub...")
                    # Ultralytics models are hosted on GitHub releases
                    base_url = "https://github.com/ultralytics/assets/releases/download/v0.0.0"
                    url = f"{base_url}/{actual_model_name}"
                    
                    logger.info(f"Downloading from: {url}")
                    response = requests.get(url, stream=True, timeout=300)
                    response.raise_for_status()
                    
                    # Save directly to target path
                    total_size = int(response.headers.get('content-length', 0))
                    with open(target_path, 'wb') as f:
                        if total_size > 0:
                            with tqdm(total=total_size, unit='B', unit_scale=True, desc=model_name) as pbar:
                                for chunk in response.iter_content(chunk_size=8192):
                                    if chunk:
                                        f.write(chunk)
                                        pbar.update(len(chunk))
                        else:
                            for chunk in response.iter_content(chunk_size=8192):
                                if chunk:
                                    f.write(chunk)
                    
                    if target_path.exists() and target_path.stat().st_size > 0:
                        size_mb = target_path.stat().st_size / (1024 * 1024)
                        logger.info(f"✓ Downloaded directly from GitHub ({size_mb:.2f} MB)")
                        saved = True
                    else:
                        logger.warning(f"Downloaded file is empty or doesn't exist")
                except Exception as e:
                    logger.warning(f"Direct download from GitHub failed: {e}")
            
            # Method 8: Use Ultralytics download utility (most reliable)
            if not saved:
                try:
                    logger.info("Attempting Ultralytics download utility...")
                    from ultralytics.utils.downloads import download
                    # Download to models directory
                    url = f"https://github.com/ultralytics/assets/releases/download/v0.0.0/{actual_model_name}"
                    logger.info(f"Downloading from: {url}")
                    file = download(url, dir=str(models_dir), unzip=False)
                    if file:
                        downloaded_file = Path(file)
                        if downloaded_file.exists():
                            # If downloaded with different name, rename it
                            if downloaded_file.name != model_name:
                                downloaded_file.rename(target_path)
                            elif downloaded_file != target_path:
                                shutil.copy2(downloaded_file, target_path)
                            logger.info(f"✓ Downloaded using Ultralytics utility to {target_path}")
                            saved = True
                except Exception as e:
                    logger.warning(f"Ultralytics download utility failed: {e}")
                    import traceback
                    logger.debug(traceback.format_exc())
            
            if saved and target_path.exists():
                size_mb = target_path.stat().st_size / (1024 * 1024)
                if size_mb > 0.1:  # Ensure file is not empty (at least 100KB)
                    logger.info(f"✓✓ {model_name} saved successfully ({size_mb:.2f} MB)")
                    downloaded_count += 1
                else:
                    logger.warning(f"⚠ {model_name} file is too small ({size_mb:.2f} MB), may be corrupted")
                    target_path.unlink()  # Remove corrupted file
                    failed_count += 1
            else:
                logger.warning(f"⚠ Could not save {model_name} to {target_path}")
                logger.warning(f"  Model may still be available via Ultralytics cache")
                failed_count += 1
                
        except Exception as e:
            logger.error(f"✗ Failed to download {model_name}: {e}", exc_info=True)
            failed_count += 1
    
    # Summary
    logger.info("\n" + "=" * 70)
    logger.info("Download Summary:")
    logger.info(f"  Downloaded: {downloaded_count}")
    logger.info(f"  Skipped (already exists): {skipped_count}")
    logger.info(f"  Failed: {failed_count}")
    logger.info(f"  Total: {len(default_models)}")
    
    # List downloaded models
    if models_dir.exists():
        local_models = list(models_dir.glob("*.pt"))
        logger.info(f"\nModels in {models_dir}:")
        for m in sorted(local_models):
            try:
                size_mb = m.stat().st_size / (1024 * 1024)
                logger.info(f"  - {m.name} ({size_mb:.2f} MB)")
            except:
                logger.info(f"  - {m.name}")
    
    logger.info("=" * 70)
    
    # Final verification - list what's actually in the directory
    if models_dir.exists():
        actual_files = list(models_dir.glob("*.pt"))
        logger.info(f"\nFinal verification - Models in {models_dir}:")
        if actual_files:
            for m in sorted(actual_files):
                try:
                    size_mb = m.stat().st_size / (1024 * 1024)
                    logger.info(f"  ✓ {m.name} ({size_mb:.2f} MB)")
                except:
                    logger.info(f"  ? {m.name}")
        else:
            logger.warning(f"  ⚠ No model files found in {models_dir}!")
            logger.warning(f"  This may indicate a problem with the download process")
    
    logger.info("=" * 70)
    
    return downloaded_count, skipped_count, failed_count


if __name__ == "__main__":
    models_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/app/models")
    
    # Ensure directory exists
    models_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"Starting model download to: {models_dir}")
    logger.info(f"Directory exists: {models_dir.exists()}")
    logger.info(f"Directory is writable: {os.access(models_dir, os.W_OK) if models_dir.exists() else False}")
    
    try:
        downloaded, skipped, failed = download_models(models_dir)
        
        # Don't fail the build if some models fail - they can download on first use
        if downloaded > 0 or skipped > 0:
            logger.info(f"Model download completed: {downloaded} downloaded, {skipped} skipped, {failed} failed")
            sys.exit(0)
        elif failed > 0:
            logger.warning(f"All models failed to download ({failed} failures)")
            logger.warning("Models will be downloaded automatically on first use")
            sys.exit(0)  # Don't fail - allow container to start
        else:
            logger.warning("No models were downloaded")
            sys.exit(0)  # Don't fail - allow container to start
    except Exception as e:
        logger.error(f"Fatal error during model download: {e}", exc_info=True)
        logger.warning("Continuing anyway - models will download on first use")
        sys.exit(0)  # Don't fail the build
