from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from pathlib import Path
import shutil
import zipfile
from app.services.cv_client import get_cv_client
from app.models.schemas import DetectionResponse, TrainingResponse

router = APIRouter(prefix="/cv", tags=["computer-vision"])


@router.get("/health")
async def cv_service_health():
    """Check CV service health status"""
    try:
        cv_client = get_cv_client()
        health = await cv_client.health_check()
        if health.get("status") == "healthy":
            return {"status": "healthy", "cv_service": health}
        else:
            return {"status": "unhealthy", "cv_service": health, "error": health.get("error")}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


@router.post("/detect", response_model=DetectionResponse)
async def detect_objects(
    file: UploadFile = File(...),
    model: Optional[str] = Form(None),
    confidence: Optional[float] = Form(None),
    iou: Optional[float] = Form(None),
    save_result: bool = Form(True)
):
    """Perform object detection on an uploaded image (via CV Service)"""
    try:
        # Save uploaded file temporarily
        upload_dir = Path("uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_path = upload_dir / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Call CV service
        cv_client = get_cv_client()
        result = await cv_client.detect(
            str(file_path),
            model=model,
            confidence=confidence,
            iou=iou,
            save_result=save_result
        )
        
        return DetectionResponse(**result)
        
    except ConnectionError as e:
        raise HTTPException(
            status_code=503, 
            detail=f"CV service unavailable: {str(e)}. Please ensure the CV service is running."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Detection error: {str(e)}")


@router.post("/detect/batch")
async def detect_batch(
    files: List[UploadFile] = File(...),
    model: Optional[str] = Form(None),
    confidence: Optional[float] = Form(None),
    iou: Optional[float] = Form(None)
):
    """Perform object detection on multiple images (via CV Service)"""
    try:
        upload_dir = Path("uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        file_paths = []
        for file in files:
            file_path = upload_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_paths.append(str(file_path))
        
        cv_client = get_cv_client()
        results = await cv_client.detect_batch(
            file_paths,
            model=model,
            confidence=confidence,
            iou=iou
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch detection error: {str(e)}")


@router.get("/models")
async def list_models():
    """List available models (via CV Service)"""
    try:
        cv_client = get_cv_client()
        return await cv_client.list_models()
    except ConnectionError as e:
        raise HTTPException(
            status_code=503, 
            detail=f"CV service unavailable: {str(e)}. Please ensure the CV service is running."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing models: {str(e)}")


@router.get("/models/{model_name}/info")
async def get_model_info(model_name: str):
    """Get information about a specific model (via CV Service)"""
    try:
        cv_client = get_cv_client()
        return await cv_client.get_model_info(model_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting model info: {str(e)}")


@router.post("/train", response_model=TrainingResponse)
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
    """Upload dataset and train a model (via CV Service)"""
    try:
        # Save uploaded dataset temporarily
        upload_dir = Path("uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        zip_path = upload_dir / dataset.filename
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(dataset.file, buffer)
        
        # Call CV service
        cv_client = get_cv_client()
        result = await cv_client.train_from_upload(
            str(zip_path),
            base_model=base_model,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size,
            device=device,
            project_name=project_name,
            strategy_file=strategy_file
        )
        
        return TrainingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.post("/train/from-folder")
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
    """Train a model from an existing dataset folder (via CV Service)"""
    try:
        cv_client = get_cv_client()
        result = await cv_client.train(
            dataset_path=dataset_path,
            base_model=base_model,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size,
            device=device,
            project_name=project_name,
            strategy_file=strategy_file
        )
        
        return TrainingResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training error: {str(e)}")


@router.get("/train/projects")
async def list_training_projects():
    """List all training projects (via CV Service)"""
    try:
        cv_client = get_cv_client()
        return await cv_client.list_training_projects()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing projects: {str(e)}")


@router.get("/train/projects/{project_name}")
async def get_training_project(project_name: str):
    """Get details of a specific training project (via CV Service)"""
    try:
        cv_client = get_cv_client()
        return await cv_client.get_training_project(project_name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting project: {str(e)}")


@router.post("/train/resume")
async def resume_training(
    checkpoint_path: str,
    epochs: Optional[int] = None,
    strategy_file: Optional[str] = None
):
    """Resume training from a checkpoint (via CV Service)"""
    try:
        cv_client = get_cv_client()
        result = await cv_client.resume_training(
            checkpoint_path=checkpoint_path,
            epochs=epochs,
            strategy_file=strategy_file
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume training error: {str(e)}")


@router.get("/strategies")
async def list_strategies():
    """List available training strategies"""
    try:
        cv_client = get_cv_client()
        return await cv_client.list_strategies()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing strategies: {str(e)}")


@router.post("/strategies")
async def create_strategy(
    name: str = Form(...),
    strategy: UploadFile = File(...)
):
    """Upload a training strategy file"""
    try:
        # Save temporarily
        upload_dir = Path("uploads/temp")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        strategy_path = upload_dir / strategy.filename
        with open(strategy_path, "wb") as buffer:
            shutil.copyfileobj(strategy.file, buffer)
        
        cv_client = get_cv_client()
        result = await cv_client.create_strategy(name, str(strategy_path))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating strategy: {str(e)}")


@router.get("/results/{filename:path}")
async def get_result_image(filename: str):
    """Get a result image (served from CV Service volume)"""
    # Results are stored in the mounted volume, accessible via CV service
    # For now, redirect or proxy to CV service
    from app.services.cv_client import get_cv_client
    cv_client = get_cv_client()
    # Note: This would need to be implemented as a file proxy
    # For simplicity, results are accessible via CV service directly
    raise HTTPException(status_code=501, detail="Use CV service directly for results")
