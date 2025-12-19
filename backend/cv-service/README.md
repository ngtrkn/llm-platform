# CV Service

Dockerized Computer Vision service for object detection and model training using Ultralytics YOLO.

## Structure

```
cv-service/
├── Dockerfile              # Docker image definition
├── requirements.txt        # Python dependencies
├── main.py                # FastAPI application
├── config/                # Configuration files
│   ├── cv_config.py       # CV configuration
│   └── .env.example       # Environment variables example
├── inference/             # Object detection code
│   └── detector.py
├── training/              # Model training code
│   └── trainer.py
└── strategies/            # Training strategy files (mounted)
    └── example_strategy.yaml
```

## Building

```bash
# Build Docker image
docker build -t llm-platform-cv-service .

# Or via docker-compose
docker-compose build cv-service
```

## Running

```bash
# Via docker-compose (recommended)
docker-compose up -d cv-service

# Standalone
docker run -d \
  -p 8001:8001 \
  -v $(pwd)/../uploads/models:/app/models \
  -v $(pwd)/../uploads/datasets:/app/datasets \
  -v $(pwd)/../uploads/results:/app/results \
  -v $(pwd)/strategies:/app/strategies \
  -v $(pwd)/config:/app/config \
  llm-platform-cv-service
```

## API Endpoints

- `GET /health` - Health check
- `GET /` - Service info
- `POST /detect` - Object detection
- `POST /detect/batch` - Batch detection
- `GET /models` - List models
- `GET /models/{name}/info` - Model info
- `POST /train` - Train from uploaded dataset
- `POST /train/from-folder` - Train from folder
- `GET /train/projects` - List training projects
- `GET /train/projects/{name}` - Get project details
- `POST /train/resume` - Resume training
- `GET /strategies` - List strategies
- `POST /strategies` - Upload strategy

## Configuration

Configuration can be set via:
1. Environment variables (in docker-compose.yml or .env)
2. Config file (`config/.env`)
3. Training strategies (YAML files in `strategies/`)

See `DOCKER_CV_GUIDE.md` for detailed documentation.
