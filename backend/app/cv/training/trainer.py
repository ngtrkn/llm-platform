from ultralytics import YOLO
from pathlib import Path
from typing import Dict, Optional, List
import yaml
import shutil
import json
from datetime import datetime
from app.cv.config.cv_config import cv_config


class ModelTrainer:
    """Model Training using Ultralytics YOLO"""
    
    def __init__(self):
        self.datasets_dir = cv_config.DATASETS_DIR
        self.output_dir = cv_config.TRAINING_OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def validate_dataset_structure(self, dataset_path: Path) -> tuple[bool, str]:
        """
        Validate that dataset follows YOLO format
        
        Expected structure:
        dataset/
        ├── images/
        │   ├── train/
        │   ├── val/
        │   └── test/ (optional)
        └── labels/
            ├── train/
            ├── val/
            └── test/ (optional)
        
        Returns:
            (is_valid, error_message)
        """
        dataset_path = Path(dataset_path)
        
        if not dataset_path.exists():
            return False, f"Dataset path does not exist: {dataset_path}"
        
        # Check for images and labels directories
        images_dir = dataset_path / "images"
        labels_dir = dataset_path / "labels"
        
        if not images_dir.exists():
            return False, "Missing 'images' directory"
        
        if not labels_dir.exists():
            return False, "Missing 'labels' directory"
        
        # Check for train and val splits
        train_images = images_dir / "train"
        val_images = images_dir / "val"
        train_labels = labels_dir / "train"
        val_labels = labels_dir / "val"
        
        if not train_images.exists():
            return False, "Missing 'images/train' directory"
        
        if not val_images.exists():
            return False, "Missing 'images/val' directory"
        
        if not train_labels.exists():
            return False, "Missing 'labels/train' directory"
        
        if not val_labels.exists():
            return False, "Missing 'labels/val' directory"
        
        # Check that images and labels match
        train_img_files = set(f.stem for f in train_images.glob("*"))
        train_label_files = set(f.stem for f in train_labels.glob("*.txt"))
        
        if train_img_files != train_label_files:
            missing_labels = train_img_files - train_label_files
            missing_images = train_label_files - train_img_files
            if missing_labels:
                return False, f"Missing labels for images: {list(missing_labels)[:5]}..."
            if missing_images:
                return False, f"Missing images for labels: {list(missing_images)[:5]}..."
        
        return True, "Dataset structure is valid"
    
    def create_dataset_yaml(
        self,
        dataset_path: Path,
        dataset_name: str,
        num_classes: int,
        class_names: List[str]
    ) -> Path:
        """
        Create dataset.yaml file for YOLO training
        
        Args:
            dataset_path: Path to dataset
            dataset_name: Name of the dataset
            num_classes: Number of classes
            class_names: List of class names
        
        Returns:
            Path to created yaml file
        """
        dataset_path = Path(dataset_path)
        yaml_path = dataset_path / "dataset.yaml"
        
        # Get absolute paths
        train_path = (dataset_path / "images" / "train").absolute()
        val_path = (dataset_path / "images" / "val").absolute()
        test_path = dataset_path / "images" / "test"
        test_path_str = str(test_path.absolute()) if test_path.exists() else None
        
        yaml_content = {
            "path": str(dataset_path.absolute()),
            "train": str(train_path),
            "val": str(val_path),
            "names": {i: name for i, name in enumerate(class_names)},
            "nc": num_classes
        }
        
        if test_path_str:
            yaml_content["test"] = test_path_str
        
        with open(yaml_path, 'w') as f:
            yaml.dump(yaml_content, f, default_flow_style=False)
        
        return yaml_path
    
    def count_classes(self, labels_dir: Path) -> tuple[int, List[str]]:
        """
        Count classes from label files
        
        Args:
            labels_dir: Path to labels directory
        
        Returns:
            (num_classes, class_names)
        """
        labels_dir = Path(labels_dir)
        class_ids = set()
        
        for label_file in labels_dir.rglob("*.txt"):
            with open(label_file, 'r') as f:
                for line in f:
                    if line.strip():
                        class_id = int(line.strip().split()[0])
                        class_ids.add(class_id)
        
        num_classes = len(class_ids)
        # Generate class names if not provided
        class_names = [f"class_{i}" for i in sorted(class_ids)]
        
        return num_classes, class_names
    
    def train(
        self,
        dataset_path: str,
        base_model: str = "yolov8n.pt",
        epochs: int = None,
        batch_size: int = None,
        img_size: int = None,
        device: str = None,
        project_name: Optional[str] = None,
        **kwargs
    ) -> Dict:
        """
        Train a YOLO model
        
        Args:
            dataset_path: Path to dataset directory
            base_model: Base model to fine-tune (yolov8n.pt, yolov8s.pt, etc.)
            epochs: Number of training epochs
            batch_size: Batch size
            img_size: Image size for training
            device: Device to use (cpu, cuda, mps)
            project_name: Name for the training project
            **kwargs: Additional training parameters
        
        Returns:
            Training results dictionary
        """
        dataset_path = Path(dataset_path)
        epochs = epochs or cv_config.DEFAULT_EPOCHS
        batch_size = batch_size or cv_config.DEFAULT_BATCH_SIZE
        img_size = img_size or cv_config.DEFAULT_IMG_SIZE
        device = device or cv_config.DEFAULT_DEVICE
        
        # Validate dataset structure
        is_valid, error_msg = self.validate_dataset_structure(dataset_path)
        if not is_valid:
            raise ValueError(f"Invalid dataset structure: {error_msg}")
        
        # Count classes
        labels_dir = dataset_path / "labels" / "train"
        num_classes, class_names = self.count_classes(labels_dir)
        
        # Create dataset.yaml
        dataset_name = dataset_path.name
        yaml_path = self.create_dataset_yaml(
            dataset_path, dataset_name, num_classes, class_names
        )
        
        # Create project directory
        if project_name is None:
            project_name = f"{dataset_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        project_dir = self.output_dir / project_name
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize model
        model = YOLO(base_model)
        
        # Training parameters
        train_params = {
            "data": str(yaml_path),
            "epochs": epochs,
            "batch": batch_size,
            "imgsz": img_size,
            "device": device,
            "project": str(project_dir),
            "name": "train",
            **kwargs
        }
        
        # Start training
        try:
            results = model.train(**train_params)
            
            # Get best model path
            best_model_path = project_dir / "train" / "weights" / "best.pt"
            last_model_path = project_dir / "train" / "weights" / "last.pt"
            
            training_info = {
                "status": "completed",
                "project_name": project_name,
                "project_dir": str(project_dir),
                "best_model": str(best_model_path) if best_model_path.exists() else None,
                "last_model": str(last_model_path) if last_model_path.exists() else None,
                "epochs": epochs,
                "batch_size": batch_size,
                "img_size": img_size,
                "device": device,
                "num_classes": num_classes,
                "class_names": class_names,
                "dataset_path": str(dataset_path),
                "results": {
                    "metrics": {
                        "mAP50": float(results.results_dict.get("metrics/mAP50(B)", 0)),
                        "mAP50-95": float(results.results_dict.get("metrics/mAP50-95(B)", 0)),
                    } if hasattr(results, 'results_dict') else {}
                }
            }
            
            # Save training info
            info_path = project_dir / "training_info.json"
            with open(info_path, 'w') as f:
                json.dump(training_info, f, indent=2)
            
            return training_info
            
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e),
                "project_name": project_name,
                "project_dir": str(project_dir)
            }
    
    def resume_training(
        self,
        checkpoint_path: str,
        epochs: Optional[int] = None,
        **kwargs
    ) -> Dict:
        """
        Resume training from a checkpoint
        
        Args:
            checkpoint_path: Path to checkpoint (.pt file)
            epochs: Additional epochs to train
            **kwargs: Additional training parameters
        
        Returns:
            Training results dictionary
        """
        checkpoint_path = Path(checkpoint_path)
        
        if not checkpoint_path.exists():
            raise ValueError(f"Checkpoint not found: {checkpoint_path}")
        
        model = YOLO(str(checkpoint_path))
        
        # Get training info if available
        project_dir = checkpoint_path.parent.parent.parent
        info_path = project_dir / "training_info.json"
        
        if info_path.exists():
            with open(info_path, 'r') as f:
                training_info = json.load(f)
            dataset_yaml = Path(training_info["dataset_path"]) / "dataset.yaml"
        else:
            raise ValueError("Cannot find training info. Please specify dataset path.")
        
        train_params = {
            "data": str(dataset_yaml),
            "resume": True,
            **kwargs
        }
        
        if epochs:
            train_params["epochs"] = epochs
        
        try:
            results = model.train(**train_params)
            return {
                "status": "completed",
                "checkpoint": str(checkpoint_path),
                "results": results.results_dict if hasattr(results, 'results_dict') else {}
            }
        except Exception as e:
            return {
                "status": "failed",
                "error": str(e)
            }
    
    def list_training_projects(self) -> List[Dict]:
        """List all training projects"""
        projects = []
        
        for project_dir in self.output_dir.iterdir():
            if project_dir.is_dir():
                info_path = project_dir / "training_info.json"
                if info_path.exists():
                    with open(info_path, 'r') as f:
                        info = json.load(f)
                        projects.append(info)
                else:
                    # Basic info if no training_info.json
                    projects.append({
                        "project_name": project_dir.name,
                        "project_dir": str(project_dir),
                        "status": "unknown"
                    })
        
        return sorted(projects, key=lambda x: x.get("project_name", ""), reverse=True)
