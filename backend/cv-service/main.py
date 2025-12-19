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
    """List available models"""
    models_dir = Path("/app/models")
    models = []
    
    # List custom models
    if models_dir.exists():
        for model_file in models_dir.glob("*.pt"):
            models.append({
                "name": model_file.name,
                "path": str(model_file),
                "type": "custom"
            })
    
    # Add default models
    default_models = ["yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt"]
    for model_name in default_models:
        models.append({
            "name": model_name,
            "path": model_name,
            "type": "default"
        })
    
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
