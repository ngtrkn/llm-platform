from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os


class CVConfig(BaseSettings):
    """Computer Vision Configuration for Docker Service"""
    
    # Model paths (mounted volumes)
    MODELS_DIR: Path = Path("/app/models")
    DATASETS_DIR: Path = Path("/app/datasets")
    RESULTS_DIR: Path = Path("/app/results")
    STRATEGIES_DIR: Path = Path("/app/strategies")
    
    # Default model settings
    DEFAULT_MODEL: str = "yolov8n.pt"  # yolov8n, yolov8s, yolov8m, yolov8l, yolov8x
    CONFIDENCE_THRESHOLD: float = 0.25
    IOU_THRESHOLD: float = 0.45
    
    # Training settings
    DEFAULT_EPOCHS: int = 100
    DEFAULT_BATCH_SIZE: int = 16
    DEFAULT_IMG_SIZE: int = 640
    DEFAULT_DEVICE: str = "cpu"  # cpu, cuda, mps
    
    # Training paths
    TRAINING_OUTPUT_DIR: Path = Path("/app/models/trained")
    
    # Dataset structure
    DATASET_STRUCTURE: dict = {
        "images": ["train", "val", "test"],
        "labels": ["train", "val", "test"]
    }
    
    class Config:
        env_file = "/app/config/.env"
        case_sensitive = True
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create directories if they don't exist
        self.MODELS_DIR.mkdir(parents=True, exist_ok=True)
        self.DATASETS_DIR.mkdir(parents=True, exist_ok=True)
        self.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        self.TRAINING_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        self.STRATEGIES_DIR.mkdir(parents=True, exist_ok=True)


cv_config = CVConfig()
