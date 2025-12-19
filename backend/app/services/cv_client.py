import httpx
from typing import Optional, List, Dict
from pathlib import Path
import os
import httpx
from app.core.config import settings


class CVServiceClient:
    """Client to communicate with Dockerized CV Service"""
    
    def __init__(self, base_url: Optional[str] = None):
        from app.core.config import settings
        self.base_url = base_url or settings.CV_SERVICE_URL
        self.client = httpx.AsyncClient(base_url=self.base_url, timeout=300.0)
    
    def _handle_error(self, error: Exception, operation: str) -> Exception:
        """Convert httpx errors to more user-friendly messages"""
        if isinstance(error, httpx.ConnectError):
            return ConnectionError(
                f"Cannot connect to CV service at {self.base_url}. "
                f"Please ensure the CV service is running. "
                f"If running locally, use CV_SERVICE_URL=http://localhost:8001 in your .env file."
            )
        elif isinstance(error, httpx.TimeoutException):
            return TimeoutError(f"CV service request timed out during {operation}")
        elif isinstance(error, httpx.HTTPStatusError):
            return Exception(f"CV service error ({error.response.status_code}): {error.response.text}")
        return error
    
    async def detect(
        self,
        file_path: str,
        model: Optional[str] = None,
        confidence: Optional[float] = None,
        iou: Optional[float] = None,
        save_result: bool = True
    ) -> Dict:
        """Perform object detection"""
        try:
            with open(file_path, "rb") as f:
                files = {"file": (Path(file_path).name, f, "image/jpeg")}
                data = {
                    "model": model,
                    "confidence": confidence,
                    "iou": iou,
                    "save_result": save_result
                }
                response = await self.client.post("/detect", files=files, data=data)
                response.raise_for_status()
                return response.json()
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError) as e:
            raise self._handle_error(e, "detection")
    
    async def detect_batch(
        self,
        file_paths: List[str],
        model: Optional[str] = None,
        confidence: Optional[float] = None,
        iou: Optional[float] = None
    ) -> Dict:
        """Perform batch detection"""
        files = []
        for file_path in file_paths:
            files.append(("files", (Path(file_path).name, open(file_path, "rb"), "image/jpeg")))
        
        data = {
            "model": model,
            "confidence": confidence,
            "iou": iou
        }
        
        try:
            response = await self.client.post("/detect/batch", files=files, data=data)
            response.raise_for_status()
            return response.json()
        finally:
            for _, (_, fp, _) in files:
                fp.close()
    
    async def list_models(self) -> Dict:
        """List available models"""
        response = await self.client.get("/models")
        response.raise_for_status()
        return response.json()
    
    async def get_model_info(self, model_name: str) -> Dict:
        """Get model information"""
        response = await self.client.get(f"/models/{model_name}/info")
        response.raise_for_status()
        return response.json()
    
    async def delete_model(self, model_name: str) -> Dict:
        """Delete a custom model weight file"""
        try:
            response = await self.client.delete(f"/models/{model_name}")
            response.raise_for_status()
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError) as e:
            raise self._handle_error(e, "model deletion")
    
    async def get_model_status(self, model_name: str) -> Dict:
        """Check if a model exists locally and get its status"""
        try:
            response = await self.client.get(f"/models/{model_name}/status")
            response.raise_for_status()
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError) as e:
            raise self._handle_error(e, "model status check")
    
    async def train(
        self,
        dataset_path: str,
        base_model: str = "yolov8n.pt",
        epochs: int = 100,
        batch_size: int = 16,
        img_size: int = 640,
        device: str = "cpu",
        project_name: Optional[str] = None,
        strategy_file: Optional[str] = None
    ) -> Dict:
        """Train model from folder"""
        params = {
            "dataset_path": dataset_path,
            "base_model": base_model,
            "epochs": epochs,
            "batch_size": batch_size,
            "img_size": img_size,
            "device": device,
            "project_name": project_name,
            "strategy_file": strategy_file
        }
        response = await self.client.post("/train/from-folder", params=params)
        response.raise_for_status()
        return response.json()
    
    async def train_from_upload(
        self,
        dataset_file_path: str,
        base_model: str = "yolov8n.pt",
        epochs: int = 100,
        batch_size: int = 16,
        img_size: int = 640,
        device: str = "cpu",
        project_name: Optional[str] = None,
        strategy_file: Optional[str] = None
    ) -> Dict:
        """Train model from uploaded ZIP file"""
        with open(dataset_file_path, "rb") as f:
            files = {"dataset": (Path(dataset_file_path).name, f, "application/zip")}
            data = {
                "base_model": base_model,
                "epochs": epochs,
                "batch_size": batch_size,
                "img_size": img_size,
                "device": device,
                "project_name": project_name,
                "strategy_file": strategy_file
            }
            response = await self.client.post("/train", files=files, data=data)
            response.raise_for_status()
            return response.json()
    
    async def list_training_projects(self) -> Dict:
        """List training projects"""
        response = await self.client.get("/train/projects")
        response.raise_for_status()
        return response.json()
    
    async def get_training_project(self, project_name: str) -> Dict:
        """Get training project details"""
        response = await self.client.get(f"/train/projects/{project_name}")
        response.raise_for_status()
        return response.json()
    
    async def resume_training(
        self,
        checkpoint_path: str,
        epochs: Optional[int] = None,
        strategy_file: Optional[str] = None
    ) -> Dict:
        """Resume training from checkpoint"""
        params = {
            "checkpoint_path": checkpoint_path,
            "epochs": epochs,
            "strategy_file": strategy_file
        }
        response = await self.client.post("/train/resume", params=params)
        response.raise_for_status()
        return response.json()
    
    async def list_strategies(self) -> Dict:
        """List available training strategies"""
        response = await self.client.get("/strategies")
        response.raise_for_status()
        return response.json()
    
    async def create_strategy(self, name: str, strategy_file_path: str) -> Dict:
        """Upload a training strategy"""
        with open(strategy_file_path, "rb") as f:
            files = {"strategy": (Path(strategy_file_path).name, f, "application/x-yaml")}
            data = {"name": name}
            response = await self.client.post("/strategies", files=files, data=data)
            response.raise_for_status()
            return response.json()
    
    async def health_check(self) -> Dict:
        """Check CV service health"""
        try:
            response = await self.client.get("/health", timeout=5.0)
            response.raise_for_status()
            return response.json()
        except (httpx.ConnectError, httpx.TimeoutException) as e:
            return {"status": "unhealthy", "error": str(e)}
        except httpx.HTTPStatusError as e:
            return {"status": "unhealthy", "error": f"HTTP {e.response.status_code}"}
    
    async def close(self):
        """Close the client"""
        await self.client.aclose()


# Global client instance
_cv_client: Optional[CVServiceClient] = None


def get_cv_client() -> CVServiceClient:
    """Get or create CV service client"""
    global _cv_client
    if _cv_client is None:
        _cv_client = CVServiceClient()
    return _cv_client
