# Docker CV Service Guide

This guide explains how to use the Dockerized Computer Vision service for object detection and model training.

## Architecture

The CV functionality is now separated into a dedicated Docker service:

- **Main Backend**: Handles LLM and general API requests
- **CV Service**: Dedicated Docker container for Ultralytics/YOLO operations
- **Communication**: HTTP API between main backend and CV service

## Volume Mounts

The CV service uses the following volume mounts for persistent storage and configuration:

```
Host Path                          Container Path          Purpose
─────────────────────────────────────────────────────────────────────
backend/uploads/models/            /app/models            Trained models
backend/uploads/datasets/          /app/datasets          Training datasets
backend/uploads/results/           /app/results           Detection results
backend/cv-service/strategies/     /app/strategies        Training strategies
backend/cv-service/config/         /app/config            Configuration files
```

## Starting the Services

### Using Docker Compose

```bash
# Start all services including CV service
docker-compose up -d

# View CV service logs
docker-compose logs -f cv-service

# Restart CV service
docker-compose restart cv-service
```

### Building the CV Service

```bash
# Build CV service image
docker-compose build cv-service

# Or build manually
cd backend/cv-service
docker build -t llm-platform-cv-service .
```

## Configuration

### Environment Variables

Set CV service configuration via environment variables in `docker-compose.yml`:

```yaml
cv-service:
  environment:
    - CV_DEFAULT_MODEL=yolov8s.pt
    - CV_DEFAULT_EPOCHS=200
    - CV_DEFAULT_BATCH_SIZE=32
    - CV_DEFAULT_DEVICE=cuda  # Use GPU if available
```

### Configuration File

Create `backend/cv-service/config/.env`:

```env
CV_DEFAULT_MODEL=yolov8n.pt
CV_DEFAULT_EPOCHS=100
CV_DEFAULT_BATCH_SIZE=16
CV_DEFAULT_IMG_SIZE=640
CV_DEFAULT_DEVICE=cpu
```

## Training Strategies

Training strategies allow you to customize training parameters without modifying code.

### Creating a Strategy

1. Create a YAML file in `backend/cv-service/strategies/`:

```yaml
# my_strategy.yaml
lr0: 0.01
lrf: 0.01
momentum: 0.937
weight_decay: 0.0005
hsv_h: 0.015
hsv_s: 0.7
hsv_v: 0.4
degrees: 0.0
translate: 0.1
scale: 0.5
shear: 0.0
perspective: 0.0
flipud: 0.0
fliplr: 0.5
mosaic: 1.0
mixup: 0.0
box: 7.5
cls: 0.5
dfl: 1.5
warmup_epochs: 3.0
warmup_momentum: 0.8
warmup_bias_lr: 0.1
close_mosaic: 10
```

2. Use the strategy when training:

```bash
curl -X POST http://localhost:8000/api/v1/cv/train \
  -F "dataset=@dataset.zip" \
  -F "strategy_file=my_strategy.yaml" \
  -F "epochs=100"
```

### Available Strategy Parameters

- **Learning Rate**: `lr0`, `lrf`, `momentum`, `weight_decay`
- **Augmentation**: `hsv_h`, `hsv_s`, `hsv_v`, `degrees`, `translate`, `scale`, `shear`, `perspective`, `flipud`, `fliplr`, `mosaic`, `mixup`
- **Loss Weights**: `box`, `cls`, `dfl`
- **Warmup**: `warmup_epochs`, `warmup_momentum`, `warmup_bias_lr`
- **Other**: `close_mosaic`

See `backend/cv-service/strategies/example_strategy.yaml` for a complete example.

## API Endpoints

All CV endpoints are available through the main backend API at `/api/v1/cv/`:

- `POST /api/v1/cv/detect` - Object detection
- `GET /api/v1/cv/models` - List models
- `POST /api/v1/cv/train` - Train model (upload dataset)
- `POST /api/v1/cv/train/from-folder` - Train from folder
- `GET /api/v1/cv/train/projects` - List training projects
- `GET /api/v1/cv/strategies` - List training strategies
- `POST /api/v1/cv/strategies` - Upload strategy

The main backend proxies requests to the CV service automatically.

## Direct CV Service Access

You can also access the CV service directly at `http://localhost:8001`:

```bash
# Health check
curl http://localhost:8001/health

# List models
curl http://localhost:8001/models

# List strategies
curl http://localhost:8001/strategies
```

## GPU Support

To enable GPU support, uncomment the deploy section in `docker-compose.yml`:

```yaml
cv-service:
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
```

Then set `CV_DEFAULT_DEVICE=cuda` in the environment.

## Updating Configuration

### Method 1: Update Config File

1. Edit `backend/cv-service/config/.env`
2. Restart the service: `docker-compose restart cv-service`

### Method 2: Update Strategy Files

1. Add/edit YAML files in `backend/cv-service/strategies/`
2. Files are automatically available (no restart needed)

### Method 3: Environment Variables

1. Update `docker-compose.yml` environment section
2. Restart: `docker-compose restart cv-service`

## Troubleshooting

### CV Service Not Starting

```bash
# Check logs
docker-compose logs cv-service

# Check if port is in use
lsof -i :8001

# Verify Docker image
docker images | grep cv-service
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

- Ensure strategy file is in `backend/cv-service/strategies/`
- Check file extension is `.yaml` or `.yml`
- Verify YAML syntax is valid

### Model Not Found

- Place custom models in `backend/uploads/models/`
- Models are automatically available in the container
- Check file permissions

## Development

### Rebuilding After Code Changes

```bash
# Rebuild and restart
docker-compose build cv-service
docker-compose up -d cv-service
```

### Testing Locally

```bash
# Run CV service locally (without Docker)
cd backend/cv-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

### Debugging

```bash
# Enter CV service container
docker-compose exec cv-service bash

# Check Python environment
python --version
pip list | grep ultralytics

# Test imports
python -c "from ultralytics import YOLO; print('OK')"
```

## Best Practices

1. **Use Strategies**: Create reusable strategy files for different training scenarios
2. **Version Control**: Keep strategy files in version control
3. **Model Management**: Organize models in subdirectories within `uploads/models/`
4. **Resource Limits**: Set appropriate resource limits in docker-compose.yml
5. **Backup**: Regularly backup `uploads/models/` and `uploads/datasets/`

## Example Workflow

1. **Prepare Dataset**: Organize in YOLO format
2. **Create Strategy**: Define training parameters in YAML
3. **Upload Strategy**: Place in `strategies/` or upload via API
4. **Start Training**: Use API with strategy file name
5. **Monitor**: Check training projects via API
6. **Use Model**: Trained models are available in `uploads/models/trained/`
