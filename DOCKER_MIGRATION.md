# Docker CV Service Migration Summary

## Overview

The Computer Vision (CV) functionality has been migrated to a separate Docker service to:
- Separate dependencies (Ultralytics, PyTorch, etc.)
- Enable independent scaling and updates
- Isolate GPU resources
- Allow configuration updates without rebuilding main backend

## Architecture Changes

### Before
```
Main Backend (FastAPI)
├── LLM Services
└── CV Services (Ultralytics)
    ├── Inference
    └── Training
```

### After
```
Main Backend (FastAPI)          CV Service (Docker)
├── LLM Services                 ├── Inference (Ultralytics)
└── CV Client (HTTP)            └── Training (Ultralytics)
    └── Proxies to CV Service
```

## Key Changes

### 1. New CV Service (`backend/cv-service/`)
- Standalone FastAPI service in Docker
- Contains all Ultralytics/YOLO code
- Separate dependencies (`requirements.txt`)
- Runs on port 8001

### 2. Volume Mounts
- `uploads/models/` → `/app/models` - Trained models
- `uploads/datasets/` → `/app/datasets` - Training datasets
- `uploads/results/` → `/app/results` - Detection results
- `cv-service/strategies/` → `/app/strategies` - Training strategies
- `cv-service/config/` → `/app/config` - Configuration files

### 3. Training Strategies
- YAML files for customizing training parameters
- Located in `backend/cv-service/strategies/`
- Can be updated without rebuilding Docker image
- Example: `example_strategy.yaml`

### 4. Main Backend Changes
- `app/services/cv_client.py` - HTTP client for CV service
- `app/api/cv_routes.py` - Updated to proxy to CV service
- Removed direct Ultralytics dependencies from main backend

## Migration Steps

### 1. Update Dependencies

Main backend no longer needs CV dependencies:
```bash
# Remove from main backend requirements.txt:
# ultralytics, opencv-python, torch, torchvision (if present)
```

### 2. Start CV Service

```bash
# Build and start
docker-compose build cv-service
docker-compose up -d cv-service

# Verify it's running
curl http://localhost:8001/health
```

### 3. Configure CV Service URL

In `backend/.env`:
```env
CV_SERVICE_URL=http://cv-service:8001  # Docker Compose
# or
CV_SERVICE_URL=http://localhost:8001   # Local development
```

### 4. Update Frontend (if needed)

No changes required - frontend continues to use `/api/v1/cv/` endpoints which now proxy to CV service.

## Benefits

1. **Separation of Concerns**: CV logic isolated from main backend
2. **Independent Updates**: Update CV service without affecting main backend
3. **Resource Isolation**: GPU resources dedicated to CV service
4. **Configuration Flexibility**: Update strategies/configs without rebuilds
5. **Scalability**: Can scale CV service independently
6. **Dependency Management**: Heavy CV dependencies don't bloat main backend

## Configuration Updates

### Training Configuration

**Method 1: Environment Variables**
```yaml
# docker-compose.yml
cv-service:
  environment:
    - CV_DEFAULT_MODEL=yolov8s.pt
    - CV_DEFAULT_EPOCHS=200
```

**Method 2: Config File**
```bash
# Edit backend/cv-service/config/.env
CV_DEFAULT_MODEL=yolov8s.pt
CV_DEFAULT_EPOCHS=200
```

**Method 3: Training Strategies**
```yaml
# backend/cv-service/strategies/my_strategy.yaml
lr0: 0.01
momentum: 0.937
# ... other parameters
```

### Updating Strategies

Strategies can be updated without rebuilding:
1. Edit YAML files in `backend/cv-service/strategies/`
2. Files are automatically available (mounted volume)
3. Use strategy name when training via API

## API Compatibility

All existing API endpoints remain the same:
- `POST /api/v1/cv/detect` - Still works
- `POST /api/v1/cv/train` - Still works
- All endpoints proxy to CV service transparently

## Troubleshooting

### CV Service Not Accessible

```bash
# Check if service is running
docker-compose ps cv-service

# Check logs
docker-compose logs cv-service

# Test connectivity
curl http://localhost:8001/health
```

### Volume Mount Issues

```bash
# Verify mounts
docker-compose exec cv-service ls -la /app/models
docker-compose exec cv-service ls -la /app/strategies

# Check permissions
ls -la backend/uploads/models/
```

### Strategy Not Found

- Ensure file is in `backend/cv-service/strategies/`
- Check file extension (`.yaml` or `.yml`)
- Verify YAML syntax

## Next Steps

1. Test object detection
2. Test model training
3. Create custom training strategies
4. Configure GPU support if available
5. Monitor CV service performance

## Rollback

If needed, you can temporarily use the old direct CV code by:
1. Restoring `app/cv/` code
2. Updating `cv_routes.py` to use direct imports
3. Installing CV dependencies in main backend

However, Docker approach is recommended for production.
