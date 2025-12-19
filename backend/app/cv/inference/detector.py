from ultralytics import YOLO
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import cv2
import numpy as np
from PIL import Image
import json
from app.cv.config.cv_config import cv_config


class ObjectDetector:
    """Object Detection using Ultralytics YOLO"""
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the detector with a model
        
        Args:
            model_path: Path to model file (.pt). If None, uses default model.
        """
        if model_path is None:
            model_path = cv_config.DEFAULT_MODEL
        
        # Check if it's a custom model or default
        if not Path(model_path).exists():
            # Try to find in models directory
            custom_model = cv_config.MODELS_DIR / model_path
            if custom_model.exists():
                model_path = str(custom_model)
            else:
                # Use default Ultralytics model
                model_path = cv_config.DEFAULT_MODEL
        
        self.model = YOLO(model_path)
        self.model_path = model_path
        self.confidence_threshold = cv_config.CONFIDENCE_THRESHOLD
        self.iou_threshold = cv_config.IOU_THRESHOLD
    
    def detect(
        self,
        image_path: str,
        conf: Optional[float] = None,
        iou: Optional[float] = None,
        save: bool = False,
        save_dir: Optional[str] = None
    ) -> Dict:
        """
        Perform object detection on an image
        
        Args:
            image_path: Path to input image
            conf: Confidence threshold (overrides default)
            iou: IoU threshold for NMS (overrides default)
            save: Whether to save annotated image
            save_dir: Directory to save results (if None, uses default)
        
        Returns:
            Dictionary with detection results
        """
        conf = conf or self.confidence_threshold
        iou = iou or self.iou_threshold
        
        # Run inference
        results = self.model.predict(
            source=image_path,
            conf=conf,
            iou=iou,
            save=save,
            project=save_dir or str(cv_config.RESULTS_DIR),
            name="detection"
        )
        
        # Process results
        result = results[0]
        
        # Extract detections
        detections = []
        if result.boxes is not None:
            boxes = result.boxes.xyxy.cpu().numpy()
            confidences = result.boxes.conf.cpu().numpy()
            class_ids = result.boxes.cls.cpu().numpy().astype(int)
            class_names = [result.names[cls_id] for cls_id in class_ids]
            
            for i, (box, conf, cls_id, cls_name) in enumerate(
                zip(boxes, confidences, class_ids, class_names)
            ):
                detections.append({
                    "id": i,
                    "class_id": int(cls_id),
                    "class_name": cls_name,
                    "confidence": float(conf),
                    "bbox": {
                        "x1": float(box[0]),
                        "y1": float(box[1]),
                        "x2": float(box[2]),
                        "y2": float(box[3]),
                        "width": float(box[2] - box[0]),
                        "height": float(box[3] - box[1])
                    }
                })
        
        # Get annotated image path if saved
        annotated_path = None
        if save:
            annotated_path = str(Path(save_dir or cv_config.RESULTS_DIR) / "detection" / Path(image_path).name)
        
        return {
            "image_path": image_path,
            "annotated_path": annotated_path,
            "detections": detections,
            "num_detections": len(detections),
            "model": self.model_path,
            "confidence_threshold": conf,
            "iou_threshold": iou
        }
    
    def detect_batch(
        self,
        image_paths: List[str],
        conf: Optional[float] = None,
        iou: Optional[float] = None,
        save: bool = False
    ) -> List[Dict]:
        """
        Perform detection on multiple images
        
        Args:
            image_paths: List of image paths
            conf: Confidence threshold
            iou: IoU threshold
            save: Whether to save annotated images
        
        Returns:
            List of detection results
        """
        results = []
        for image_path in image_paths:
            result = self.detect(image_path, conf=conf, iou=iou, save=save)
            results.append(result)
        return results
    
    def get_model_info(self) -> Dict:
        """Get information about the loaded model"""
        return {
            "model_path": self.model_path,
            "model_type": "YOLO",
            "input_size": self.model.overrides.get("imgsz", 640),
            "classes": list(self.model.names.values()) if hasattr(self.model, 'names') else [],
            "num_classes": len(self.model.names) if hasattr(self.model, 'names') else 0
        }


# Global detector instance (lazy loaded)
_detector_instance: Optional[ObjectDetector] = None


def get_detector(model_path: Optional[str] = None) -> ObjectDetector:
    """Get or create detector instance"""
    global _detector_instance
    if _detector_instance is None or (model_path and _detector_instance.model_path != model_path):
        _detector_instance = ObjectDetector(model_path)
    return _detector_instance
