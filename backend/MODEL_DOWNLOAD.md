# Model Download Guide

## Quick Download (Run Now)

### Option 1: Download to Host Directory (Recommended)

Run this script on the host to download models directly to the mounted directory:

```bash
cd /mnt/hdd1/code/github/llm-platform/backend
./download_models_now.sh
```

This will download all default models (YOLOv8, YOLOv11, YOLOE-11) to `./uploads/models/`

### Option 2: Download via Running Container

If the container is already running:

```bash
# Enter the container
docker exec -it llm-platform-cv-service bash

# Run download script
python3 /app/download_models.py /app/models

# Or trigger via API
curl -X POST http://localhost:8001/models/pre-download
```

### Option 3: Download During Container Startup

Models will be automatically downloaded when the container starts (via entrypoint.sh).

## Default Models Included

- **YOLOv8**: yolov8n.pt, yolov8s.pt, yolov8m.pt, yolov8l.pt, yolov8x.pt
- **YOLOv11**: yolo11n.pt, yolo11s.pt, yolo11m.pt, yolo11l.pt, yolo11x.pt  
- **YOLOE-11**: yoloe-11n.pt, yoloe-11s.pt, yoloe-11m.pt, yoloe-11l.pt, yoloe-11x.pt

## Model Storage

Models are stored in: `./backend/uploads/models/` (mounted to `/app/models` in container)

This directory persists across container restarts.

## Verification

Check if models are downloaded:

```bash
ls -lh backend/uploads/models/*.pt
```

Or check via API:

```bash
curl http://localhost:8001/models
```
