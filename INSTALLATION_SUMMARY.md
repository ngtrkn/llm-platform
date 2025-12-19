# Installation Summary

Quick reference for installing and setting up the AI Platform.

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** (includes npm)
- **Docker & Docker Compose** (for CV service)
- **Git**

## Quick Installation

```bash
# 1. Clone repository
git clone <repository-url>
cd llm-platform

# 2. Run automated installation
chmod +x install.sh
./install.sh

# 3. Configure API keys
nano backend/.env  # Add at least one LLM API key

# 4. Start all services
./start-all.sh
```

## Manual Installation Steps

### 1. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# Edit .env with API keys
mkdir -p uploads/{models,datasets,results}
```

### 2. Frontend Setup

```bash
cd frontend
npm install  # Installs js-yaml automatically
# YAML config already included in public/config/yolo-config.yaml
```

**Note**: The frontend includes:
- `js-yaml` dependency (for YAML config parsing)
- Default YAML config at `public/config/yolo-config.yaml`
- All refactored components

### 3. CV Service Setup

```bash
# Build Docker image
docker-compose build cv-service

# Start services
docker-compose up -d
```

**Models**: Automatically downloaded on first container start:
- YOLOv8 (nano, small, medium, large, xlarge)
- YOLOv11 (nano, small, medium, large, xlarge) ⭐ NEW
- YOLOE-11 (nano, small, medium, large, xlarge) ⭐ NEW

## Configuration

### Backend (.env)

**Minimum required:**
```env
# At least one LLM provider
OPENAI_API_KEY=your_key_here
# OR
GEMINI_API_KEY=your_key_here
# OR
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key_here

# CV Service URL
CV_SERVICE_URL=http://localhost:8001
```

### Frontend (YAML Config)

**File**: `frontend/public/config/yolo-config.yaml`

Customize:
- Add new YOLO models
- Change default confidence/IoU
- Adjust color schemes
- Modify visualization settings

**No code changes needed** - just edit YAML!

## Starting Services

### Option 1: Start All (Recommended)

```bash
./start-all.sh
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Docker:**
```bash
docker-compose up -d
```

## Verification

```bash
# Backend
curl http://localhost:8000/health

# Frontend
open http://localhost:3000

# CV Service
curl http://localhost:8001/health
curl http://localhost:8001/models

# Docker
docker-compose ps
```

## New Features (Latest Version)

### Object Detection
- ✅ YOLOv11 and YOLOE-11 support
- ✅ Interactive CRUD operations (create, edit, delete)
- ✅ Manual bounding box drawing
- ✅ Detection selection and highlighting
- ✅ YOLO format annotation download
- ✅ Segmentation mask visualization
- ✅ Model management (upload/download/delete)
- ✅ YAML configuration system

### Code Architecture
- ✅ Refactored into modular components
- ✅ Separated logic from UI
- ✅ Custom hooks for state management
- ✅ Utility classes for business logic
- ✅ YAML-based configuration

## Troubleshooting

### Frontend Issues

**YAML config not loading:**
- Check browser console
- Verify `public/config/yolo-config.yaml` exists
- Component falls back to defaults

**Models not appearing:**
- Check CV service is running: `docker-compose ps`
- Check logs: `docker-compose logs cv-service`
- Verify models downloaded: `docker exec -it llm-platform-cv-service ls /app/models`

### Backend Issues

**CV service connection:**
- Verify `CV_SERVICE_URL` in `.env`
- Check Docker container: `docker-compose ps cv-service`
- Test connectivity: `curl http://localhost:8001/health`

### Docker Issues

**Models not downloading:**
- Check logs: `docker-compose logs cv-service`
- Rebuild: `docker-compose build cv-service --no-cache`
- Check volume mount: `docker-compose config`

## File Structure

```
llm-platform/
├── backend/
│   ├── app/                    # Backend application
│   ├── uploads/                # Upload directories
│   └── .env                    # Backend configuration
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   └── objectDetection/ # Refactored components
│   │   ├── config/             # Config loaders
│   │   ├── hooks/              # Custom hooks
│   │   └── utils/              # Utility classes
│   └── public/
│       └── config/
│           └── yolo-config.yaml # YOLO configuration
├── docker-compose.yml          # Docker services
└── install.sh                  # Installation script
```

## Next Steps

1. **Configure API Keys**: Edit `backend/.env`
2. **Customize Models**: Edit `frontend/public/config/yolo-config.yaml`
3. **Start Services**: Run `./start-all.sh`
4. **Test Features**: 
   - Try object detection
   - Create/edit detections
   - Download YOLO annotations
   - Upload custom models

## Documentation

- **[README.md](README.md)** - Main documentation
- **[INSTALLATION.md](INSTALLATION.md)** - Detailed installation guide
- **[CV_GUIDE.md](CV_GUIDE.md)** - Computer Vision guide
- **[frontend/REFACTORING.md](frontend/REFACTORING.md)** - Component architecture
- **[frontend/README.md](frontend/README.md)** - Frontend documentation

## Support

- Check logs: `docker-compose logs`
- Review documentation files
- Check API docs: http://localhost:8000/docs
- Verify all services are running
