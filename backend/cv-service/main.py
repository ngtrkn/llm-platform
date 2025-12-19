from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from pathlib import Path
import shutil
import zipfile
import json
import yaml
from datetime import datetime
import numpy as np

from inference.detector import get_detector
from training.trainer import ModelTrainer
from config.cv_config import cv_config
from ultralytics import YOLO
import asyncio
import logging
import shutil
import torch

logger = logging.getLogger(__name__)


def make_json_serializable(obj):
    """Convert numpy types and other non-serializable types to JSON-compatible types"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        try:
            return make_json_serializable(vars(obj))
        except TypeError:
            return str(obj)
    return obj

app = FastAPI(title="CV Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_default_models():
    """Get list of default models"""
    return [
        "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
        "yolo11n.pt", "yolo11s.pt", "yolo11m.pt", "yolo11l.pt", "yolo11x.pt",
        "yoloe-11n.pt", "yoloe-11s.pt", "yoloe-11m.pt", "yoloe-11l.pt", "yoloe-11x.pt"
    ]


def pre_download_models():
    """Pre-download default models, especially YOLOE models, and save to models directory"""
    default_models = get_default_models()
    models_dir = Path("/app/models")
    models_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("Starting pre-download of default models...")
    logger.info(f"Models directory: {models_dir}")
    logger.info(f"Default models to download: {default_models}")
    logger.info("=" * 60)
    
    downloaded_count = 0
    failed_count = 0
    
    for model_name in default_models:
        try:
            target_path = models_dir / model_name
            
            # Skip if already exists locally
            if target_path.exists():
                size_mb = target_path.stat().st_size / (1024 * 1024)
                logger.info(f"✓ {model_name} already exists locally ({size_mb:.2f} MB)")
                downloaded_count += 1
                continue
            
            logger.info(f"\n--- Pre-downloading {model_name} ---")
            
            # Try to download the model - Ultralytics will download automatically
            actual_model_name = model_name
            model = None
            
            # For YOLOE models, try both naming conventions
            if "yoloe-11" in model_name:
                # Try dash version first
                try:
                    logger.info(f"Attempting to load: {model_name}")
                    model = YOLO(model_name)
                    logger.info(f"✓ Successfully loaded {model_name}")
                except Exception as e1:
                    logger.warning(f"Failed with {model_name}: {e1}")
                    # Try alternative naming without dash
                    alt_name = model_name.replace("yoloe-11", "yoloe11")
                    logger.info(f"Trying alternative name: {alt_name}")
                    try:
                        model = YOLO(alt_name)
                        actual_model_name = alt_name
                        logger.info(f"✓ Successfully loaded {alt_name}")
                    except Exception as e2:
                        logger.error(f"Both naming conventions failed for {model_name}")
                        logger.error(f"  - {model_name}: {e1}")
                        logger.error(f"  - {alt_name}: {e2}")
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
                logger.warning(f"Could not initialize model {model_name}")
                failed_count += 1
                continue
            
            # Now find where Ultralytics saved the model file
            saved = False
            
            # Method 1: Check the model's checkpoint path directly
            try:
                if hasattr(model, 'ckpt_path') and model.ckpt_path:
                    ckpt = Path(model.ckpt_path)
                    logger.info(f"Checking ckpt_path: {ckpt}")
                    if ckpt.exists():
                        shutil.copy2(ckpt, target_path)
                        logger.info(f"✓ Copied from ckpt_path to {target_path}")
                        saved = True
            except Exception as e:
                logger.debug(f"Error checking ckpt_path: {e}")
            
            # Method 2: Check Ultralytics cache directories with actual model name
            if not saved:
                cache_locations = [
                    Path.home() / ".ultralytics" / "weights" / actual_model_name,
                    Path.home() / ".ultralytics" / actual_model_name,
                    Path.home() / ".cache" / "ultralytics" / actual_model_name,
                    Path("/root/.ultralytics/weights") / actual_model_name if Path("/root").exists() else None,
                    Path("/root/.ultralytics") / actual_model_name if Path("/root").exists() else None,
                ]
                
                for cache_path in cache_locations:
                    if cache_path and cache_path.exists():
                        logger.info(f"Found model in cache: {cache_path}")
                        shutil.copy2(cache_path, target_path)
                        logger.info(f"✓ Copied {actual_model_name} to {target_path}")
                        saved = True
                        break
            
            # Method 3: Search recursively in Ultralytics directories
            if not saved:
                import os
                search_dirs = [
                    Path.home() / ".ultralytics",
                    Path.home() / ".cache" / "ultralytics",
                    Path("/root/.ultralytics") if Path("/root").exists() else None,
                ]
                
                for search_dir in search_dirs:
                    if search_dir and search_dir.exists():
                        logger.info(f"Searching in: {search_dir}")
                        try:
                            for root, dirs, files in os.walk(search_dir):
                                if actual_model_name in files:
                                    source_file = Path(root) / actual_model_name
                                    shutil.copy2(source_file, target_path)
                                    logger.info(f"✓ Found and copied from {source_file} to {target_path}")
                                    saved = True
                                    break
                            if saved:
                                break
                        except Exception as e:
                            logger.debug(f"Error searching {search_dir}: {e}")
            
            # Method 4: Try to save model directly
            if not saved:
                try:
                    if hasattr(model, 'model'):
                        # Try to save the model
                        torch.save(model.model, target_path)
                        logger.info(f"✓ Saved model directly to {target_path}")
                        saved = True
                except Exception as e:
                    logger.debug(f"Could not save model directly: {e}")
            
            if saved and target_path.exists():
                size_mb = target_path.stat().st_size / (1024 * 1024)
                logger.info(f"✓✓ {model_name} successfully saved ({size_mb:.2f} MB)")
                downloaded_count += 1
            else:
                logger.warning(f"⚠ Could not save {model_name} to {target_path}")
                logger.warning(f"  Model is downloaded but may be in Ultralytics cache only")
                failed_count += 1
                    
        except Exception as e:
            logger.error(f"✗ Failed to pre-download {model_name}: {str(e)}", exc_info=True)
            failed_count += 1
    
    # Final summary
    logger.info("\n" + "=" * 60)
    logger.info("Model pre-download summary:")
    logger.info(f"  Successfully downloaded: {downloaded_count}/{len(default_models)}")
    logger.info(f"  Failed: {failed_count}/{len(default_models)}")
    
    # List all models in the directory
    if models_dir.exists():
        local_models = list(models_dir.glob("*.pt"))
        logger.info(f"\nModels currently in {models_dir}:")
        for m in local_models:
            size_mb = m.stat().st_size / (1024 * 1024)
            logger.info(f"  - {m.name} ({size_mb:.2f} MB)")
        if not local_models:
            logger.warning(f"  No models found in {models_dir}!")
    else:
        logger.error(f"Models directory {models_dir} does not exist!")
    
    logger.info("=" * 60)


@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("CV Service starting up...")
    # Models are already downloaded by entrypoint.sh before service starts
    # But we can still run pre-download in background as a safety check
    # This ensures any missing models are downloaded
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, pre_download_models)


@app.post("/models/pre-download")
async def trigger_pre_download():
    """Manually trigger pre-download of default models"""
    try:
        # Run in background
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, pre_download_models)
        return {
            "status": "started",
            "message": "Model pre-download started in background"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting pre-download: {str(e)}")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "cv-service"}


@app.get("/")
async def root():
    return {
        "service": "CV Service",
        "version": "1.0.0",
        "endpoints": {
            "detection": "/detect",
            "models": "/models",
            "training": "/train",
            "projects": "/train/projects"
        }
    }


# Detection endpoints
@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    confidence: Optional[float] = Form(None),
    iou: Optional[float] = Form(None),
    save_result: bool = Form(True)
):
    """Perform object detection on an uploaded image"""
    try:
        # Save uploaded file
        upload_dir = Path("/app/uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get detector
        detector = get_detector(model)
        
        # Perform detection
        result = detector.detect(
            str(file_path),
            conf=confidence,
            iou=iou,
            save=save_result
        )
        
        # Ensure all values are JSON serializable
        return make_json_serializable(result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")


@app.post("/detect/batch")
async def detect_batch(
    files: List[UploadFile] = File(...),
    model: Optional[str] = Form(None),
    confidence: Optional[float] = Form(None),
    iou: Optional[float] = Form(None)
):
    """Perform object detection on multiple images"""
    try:
        upload_dir = Path("/app/uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        image_paths = []
        for file in files:
            file_path = upload_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            image_paths.append(str(file_path))
        
        detector = get_detector(model)
        results = detector.detect_batch(
            image_paths,
            conf=confidence,
            iou=iou,
            save=True
        )
        
        return make_json_serializable({"results": results})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch detection error: {str(e)}")


@app.get("/models")
async def list_models():
    """List available models - always includes all default models"""
    models_dir = Path("/app/models")
    models = []
    default_models = get_default_models()
    seen_models = set()
    
    logger.info(f"Listing models from {models_dir}")
    logger.info(f"Default models to include: {default_models}")
    
    # First, ALWAYS add all default models (they should always be available)
    for model_name in default_models:
        model_path = models_dir / model_name
        
        # Check if model exists with original name
        exists_locally = model_path.exists()
        
        # For YOLOE models, also check alternative naming
        if not exists_locally and "yoloe-11" in model_name:
            alt_name = model_name.replace("yoloe-11", "yoloe11")
            alt_path = models_dir / alt_name
            if alt_path.exists():
                exists_locally = True
                model_path = alt_path
                logger.info(f"Found YOLOE model with alternative name: {alt_name}")
        
        # Always add default models to the list, even if not downloaded yet
        model_info = {
            "name": model_name,
            "path": str(model_path) if exists_locally else model_name,
            "type": "default",
            "exists_locally": exists_locally
        }
        
        if exists_locally:
            try:
                size_mb = model_path.stat().st_size / (1024 * 1024)
                model_info["size_mb"] = round(size_mb, 2)
            except:
                pass
        
        models.append(model_info)
        seen_models.add(model_name)
        # Also mark alternative naming as seen
        if "yoloe-11" in model_name:
            seen_models.add(model_name.replace("yoloe-11", "yoloe11"))
    
    # Then, add custom models (those not in default list)
    if models_dir.exists():
        local_files = list(models_dir.glob("*.pt"))
        logger.info(f"Found {len(local_files)} model files in directory")
        for model_file in local_files:
            if model_file.name not in seen_models:
                try:
                    size_mb = model_file.stat().st_size / (1024 * 1024)
                    models.append({
                        "name": model_file.name,
                        "path": str(model_file),
                        "type": "custom",
                        "exists_locally": True,
                        "size_mb": round(size_mb, 2)
                    })
                except Exception as e:
                    logger.warning(f"Error reading {model_file}: {e}")
    
    logger.info(f"Returning {len(models)} models total")
    return {"models": models}


@app.get("/models/{model_name}/info")
async def get_model_info(model_name: str):
    """Get information about a specific model"""
    try:
        detector = get_detector(model_name)
        info = detector.get_model_info()
        return make_json_serializable(info)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")


@app.post("/models/upload")
async def upload_model(
    file: UploadFile = File(...),
    model_name: Optional[str] = Form(None)
):
    """Upload a custom model weight file"""
    try:
        models_dir = Path("/app/models")
        models_dir.mkdir(parents=True, exist_ok=True)
        
        # Use provided name or filename
        filename = model_name or file.filename
        if not filename:
            raise HTTPException(status_code=400, detail="Model name or filename required")
        
        # Ensure .pt extension
        if not filename.endswith('.pt'):
            filename += '.pt'
        
        # Save model file
        model_path = models_dir / filename
        with open(model_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        return {
            "status": "success",
            "message": f"Model {filename} uploaded successfully",
            "model_name": filename,
            "path": str(model_path),
            "size": model_path.stat().st_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading model: {str(e)}")


@app.get("/models/{model_name}/download")
async def download_model(model_name: str):
    """Download a model weight file"""
    try:
        models_dir = Path("/app/models")
        model_path = models_dir / model_name
        
        # Check if model exists locally
        if model_path.exists():
            return FileResponse(
                path=str(model_path),
                filename=model_name,
                media_type="application/octet-stream"
            )
        
        # Check if it's a default model (will be downloaded by Ultralytics on first use)
        default_models = get_default_models()
        
        if model_name in default_models:
            raise HTTPException(
                status_code=404,
                detail=f"Model {model_name} is a default model and will be automatically downloaded on first use. "
                       f"Please use the model in detection/training to trigger download."
            )
        
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error downloading model: {str(e)}")


@app.delete("/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a custom model weight file"""
    try:
        models_dir = Path("/app/models")
        model_path = models_dir / model_name
        
        if not model_path.exists():
            raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
        
        # Prevent deletion of default models
        default_models = [
            "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
            "yolo11n.pt", "yolo11s.pt", "yolo11m.pt", "yolo11l.pt", "yolo11x.pt",
            "yoloe-11n.pt", "yoloe-11s.pt", "yoloe-11m.pt", "yoloe-11l.pt", "yoloe-11x.pt"
        ]
        
        if model_name in default_models:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete default model {model_name}"
            )
        
        model_path.unlink()
        return {
            "status": "success",
            "message": f"Model {model_name} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting model: {str(e)}")


@app.get("/models/{model_name}/status")
async def get_model_status(model_name: str):
    """Check if a model exists locally and get its status"""
    try:
        models_dir = Path("/app/models")
        model_path = models_dir / model_name
        
        exists_locally = model_path.exists()
        size = model_path.stat().st_size if exists_locally else None
        
        default_models = [
            "yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt",
            "yolo11n.pt", "yolo11s.pt", "yolo11m.pt", "yolo11l.pt", "yolo11x.pt",
            "yoloe-11n.pt", "yoloe-11s.pt", "yoloe-11m.pt", "yoloe-11l.pt", "yoloe-11x.pt"
        ]
        
        is_default = model_name in default_models
        
        return {
            "model_name": model_name,
            "exists_locally": exists_locally,
            "is_default": is_default,
            "size_bytes": size,
            "size_mb": round(size / (1024 * 1024), 2) if size else None,
            "path": str(model_path) if exists_locally else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking model status: {str(e)}")


# Training endpoints
@app.post("/train")
async def train_model(
    dataset: UploadFile = File(...),
    base_model: str = Form("yolov8n.pt"),
    epochs: int = Form(100),
    batch_size: int = Form(16),
    img_size: int = Form(640),
    device: str = Form("cpu"),
    project_name: Optional[str] = Form(None),
    strategy_file: Optional[str] = Form(None)
):
    """Upload dataset and train a model"""
    try:
        trainer = ModelTrainer()
        
        # Save uploaded dataset (expecting zip file)
        upload_dir = Path("/app/uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        zip_path = upload_dir / dataset.filename
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(dataset.file, buffer)
        
        # Extract dataset
        dataset_name = Path(dataset.filename).stem
        extract_dir = Path("/app/datasets") / dataset_name
        extract_dir.mkdir(parents=True, exist_ok=True)
        
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        
        # Load training strategy if provided
        training_kwargs = {}
        if strategy_file:
            strategy_path = Path("/app/strategies") / strategy_file
            if strategy_path.exists():
                with open(strategy_path, 'r') as f:
                    training_kwargs = yaml.safe_load(f) or {}
        
        # Start training
        result = trainer.train(
            dataset_path=str(extract_dir),
            base_model=base_model,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size,
            device=device,
            project_name=project_name,
            **training_kwargs
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@app.post("/train/from-folder")
async def train_from_folder(
    dataset_path: str,
    base_model: str = "yolov8n.pt",
    epochs: int = 100,
    batch_size: int = 16,
    img_size: int = 640,
    device: str = "cpu",
    project_name: Optional[str] = None,
    strategy_file: Optional[str] = None
):
    """Train a model from an existing dataset folder"""
    try:
        trainer = ModelTrainer()
        
        dataset_path_obj = Path(dataset_path)
        if not dataset_path_obj.exists():
            raise HTTPException(status_code=404, detail=f"Dataset path not found: {dataset_path}")
        
        # Load training strategy if provided
        training_kwargs = {}
        if strategy_file:
            strategy_path = Path("/app/strategies") / strategy_file
            if strategy_path.exists():
                with open(strategy_path, 'r') as f:
                    training_kwargs = yaml.safe_load(f) or {}
        
        result = trainer.train(
            dataset_path=str(dataset_path_obj),
            base_model=base_model,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size,
            device=device,
            project_name=project_name,
            **training_kwargs
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@app.get("/train/projects")
async def list_training_projects():
    """List all training projects"""
    try:
        trainer = ModelTrainer()
        projects = trainer.list_training_projects()
        return {"projects": projects}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing projects: {str(e)}")


@app.get("/train/projects/{project_name}")
async def get_training_project(project_name: str):
    """Get details of a specific training project"""
    try:
        trainer = ModelTrainer()
        projects = trainer.list_training_projects()
        
        project = next((p for p in projects if p.get("project_name") == project_name), None)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting project: {str(e)}")


@app.post("/train/resume")
async def resume_training(
    checkpoint_path: str,
    epochs: Optional[int] = None,
    strategy_file: Optional[str] = None
):
    """Resume training from a checkpoint"""
    try:
        trainer = ModelTrainer()
        
        # Load training strategy if provided
        training_kwargs = {}
        if strategy_file:
            strategy_path = Path("/app/strategies") / strategy_file
            if strategy_path.exists():
                with open(strategy_path, 'r') as f:
                    training_kwargs = yaml.safe_load(f) or {}
        
        result = trainer.resume_training(checkpoint_path, epochs=epochs, **training_kwargs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume training error: {str(e)}")


@app.get("/strategies")
async def list_strategies():
    """List available training strategies"""
    strategies_dir = Path("/app/strategies")
    strategies = []
    
    if strategies_dir.exists():
        for strategy_file in strategies_dir.glob("*.yaml"):
            strategies.append({
                "name": strategy_file.stem,
                "file": strategy_file.name,
                "path": str(strategy_file)
            })
        for strategy_file in strategies_dir.glob("*.yml"):
            strategies.append({
                "name": strategy_file.stem,
                "file": strategy_file.name,
                "path": str(strategy_file)
            })
    
    return {"strategies": strategies}


@app.post("/strategies")
async def create_strategy(
    name: str = Form(...),
    strategy: UploadFile = File(...)
):
    """Upload a training strategy file"""
    try:
        strategies_dir = Path("/app/strategies")
        strategies_dir.mkdir(parents=True, exist_ok=True)
        
        # Validate YAML
        content = await strategy.read()
        try:
            yaml.safe_load(content)
        except yaml.YAMLError as e:
            raise HTTPException(status_code=400, detail=f"Invalid YAML: {str(e)}")
        
        # Save strategy
        strategy_path = strategies_dir / f"{name}.yaml"
        with open(strategy_path, "wb") as f:
            f.write(content)
        
        return {
            "name": name,
            "file": strategy_path.name,
            "path": str(strategy_path),
            "status": "created"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating strategy: {str(e)}")


@app.get("/results/{filename:path}")
async def get_result_image(filename: str):
    """Get a result image"""
    result_path = Path("/app/results") / filename
    if result_path.exists():
        return FileResponse(result_path)
    raise HTTPException(status_code=404, detail="Result image not found")
