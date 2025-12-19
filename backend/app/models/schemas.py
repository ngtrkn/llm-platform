from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class Message(BaseModel):
    role: str
    content: str


class GenerateRequest(BaseModel):
    provider: str
    prompt: str
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    user_id: Optional[str] = "default"


class ChatRequest(BaseModel):
    provider: str
    messages: List[Message]
    model: Optional[str] = None
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    user_id: Optional[str] = "default"
    save_to_db: Optional[bool] = False
    db_type: Optional[str] = "mongodb"


class GenerateResponse(BaseModel):
    text: str
    provider: str
    model: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    provider: str
    conversation_id: Optional[str] = None
    model: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    messages: List[Dict[str, str]]
    created_at: str


class ProviderListResponse(BaseModel):
    llm_providers: List[str]
    database_providers: List[str]


# Computer Vision Schemas
class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float


class Detection(BaseModel):
    id: int
    class_id: int
    class_name: str
    confidence: float
    bbox: BBox


class DetectionRequest(BaseModel):
    model: Optional[str] = None
    confidence: Optional[float] = 0.25
    iou: Optional[float] = 0.45
    save_result: bool = True


class DetectionResponse(BaseModel):
    image_path: str
    annotated_path: Optional[str] = None
    detections: List[Detection]
    num_detections: int
    model: str
    confidence_threshold: float
    iou_threshold: float


class TrainingRequest(BaseModel):
    dataset_path: str
    base_model: str = "yolov8n.pt"
    epochs: int = 100
    batch_size: int = 16
    img_size: int = 640
    device: str = "cpu"
    project_name: Optional[str] = None


class TrainingResponse(BaseModel):
    status: str
    project_name: Optional[str] = None
    project_dir: Optional[str] = None
    best_model: Optional[str] = None
    last_model: Optional[str] = None
    epochs: Optional[int] = None
    batch_size: Optional[int] = None
    img_size: Optional[int] = None
    device: Optional[str] = None
    num_classes: Optional[int] = None
    class_names: Optional[List[str]] = None
    dataset_path: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
