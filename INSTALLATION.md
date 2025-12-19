# Installation Guide

Complete installation guide for the AI Platform with LLM and Computer Vision capabilities.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Installation](#quick-installation)
3. [Manual Installation](#manual-installation)
4. [Configuration](#configuration)
5. [Starting Services](#starting-services)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required

- **Python 3.8+** - [Download](https://www.python.org/downloads/)
- **Node.js 16+** - [Download](https://nodejs.org/)
- **npm** - Comes with Node.js
- **Git** - [Download](https://git-scm.com/downloads)

### Optional (for CV features)

- **Docker** - [Download](https://docs.docker.com/get-docker/)
- **Docker Compose** - [Download](https://docs.docker.com/compose/install/)

### Check Prerequisites

```bash
python3 --version  # Should be 3.8 or higher
node --version     # Should be 16 or higher
npm --version      # Should be 7 or higher
docker --version   # Optional
```

## Quick Installation

### Automated Installation Script

The easiest way to install everything:

```bash
# Make script executable
chmod +x install.sh

# Run installation
./install.sh
```

The script will:
- Check prerequisites
- Set up Python virtual environment
- Install backend dependencies
- Install frontend dependencies
- Build CV service Docker image
- Create startup scripts
- Set up configuration files

After installation, follow the on-screen instructions to:
1. Edit `backend/.env` with your API keys
2. Start services using `./start-all.sh`

## Manual Installation

### Step 1: Clone Repository

```bash
git clone <repository-url>
cd llm-platform
```

### Step 2: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Create upload directories
mkdir -p uploads/{models,datasets,results,temp}
mkdir -p cv-service/{strategies,config}

cd ..
```

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies (includes js-yaml for YAML config)
npm install

# YAML configuration is already included in public/config/yolo-config.yaml
# You can customize it to add new models or change settings

cd ..
```

### Step 4: CV Service Setup (Docker)

```bash
# Build CV service Docker image
docker-compose build cv-service
# Or with newer Docker:
# docker compose build cv-service

# For CUDA 12.8+ support, set CUDA_VERSION in .env:
# CUDA_VERSION=12.8.0-cudnn-runtime-ubuntu22.04
# Then rebuild:
docker-compose build cv-service
```

**Note**: The CV service uses CUDA 12.7.0 by default. If your GPU requires CUDA 12.8+, see `backend/cv-service/CUDA_12.8_SETUP.md` for instructions.

### Step 5: Configuration

Edit `backend/.env`:

```env
# At minimum, configure at least one LLM provider:
OPENAI_API_KEY=your_openai_key_here
# OR
GEMINI_API_KEY=your_gemini_key_here
# OR
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_key_here

# Optional: Database configuration
POSTGRES_HOST=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=llm_platform

MONGODB_URL=mongodb://localhost:27017

# CV Service URL
# - If backend runs in Docker: http://cv-service:8001
# - If backend runs locally: http://localhost:8001
CV_SERVICE_URL=http://localhost:8001

# CUDA Version (optional, for GPU support)
# Default: 12.7.0-cudnn-runtime-ubuntu22.04
# For CUDA 12.8+: 12.8.0-cudnn-runtime-ubuntu22.04
CUDA_VERSION=12.7.0-cudnn-runtime-ubuntu22.04
```

## Configuration

### Backend Configuration

**File**: `backend/.env`

Key settings:
- **LLM API Keys**: At least one required (OpenAI, Gemini, or Azure)
- **Database URLs**: Optional but recommended for conversation storage
- **CV Service URL**: Default `http://cv-service:8001` (Docker) or `http://localhost:8001` (local)

### CV Service Configuration

**File**: `backend/cv-service/config/.env`

```env
CV_DEFAULT_MODEL=yolov8n.pt
CV_DEFAULT_EPOCHS=100
CV_DEFAULT_BATCH_SIZE=16
CV_DEFAULT_IMG_SIZE=640
CV_DEFAULT_DEVICE=cpu  # or cuda for GPU
```

### Training Strategies

Create YAML files in `backend/cv-service/strategies/`:

```yaml
# Example: backend/cv-service/strategies/custom_strategy.yaml
lr0: 0.01
momentum: 0.937
weight_decay: 0.0005
# ... see example_strategy.yaml for all options
```

## Starting Services

### Option 1: Start All Services (Recommended)

```bash
./start-all.sh
```

This starts:
- Docker services (databases + CV service)
- Backend API server
- Frontend development server

### Option 2: Start Services Separately

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

**Terminal 3 - Docker Services:**
```bash
docker-compose up -d
```

### Option 3: Using Docker Compose for Everything

```bash
# Start databases and CV service
docker-compose up -d

# Start backend (separate terminal)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Start frontend (separate terminal)
cd frontend && npm run dev
```

## Verification

### 1. Check Backend

```bash
# Health check
curl http://localhost:8000/health

# API docs
open http://localhost:8000/docs
```

### 2. Check Frontend

```bash
# Open in browser
open http://localhost:3000
```

### 3. Check CV Service

```bash
# Health check
curl http://localhost:8001/health

# List models
curl http://localhost:8001/models
```

### 4. Check Docker Services

```bash
# List running containers
docker-compose ps

# Check CV service logs
docker-compose logs cv-service
```

## Troubleshooting

### Common Installation Issues

**grpcio build failures**: See [FAQ.md](FAQ.md#q-failed-to-build-installable-wheels-for-grpcio)

**CORS_ORIGINS parsing errors**: See [FAQ.md](FAQ.md#q-pydantic_settings-error-parsing-cors_origins)

**Docker GPU errors**: See [FAQ.md](FAQ.md#q-error-could-not-select-device-driver-nvidia)

**CV service connection issues**: See [FAQ.md](FAQ.md#q-detection-failed-network-error--cv-service-unavailable)

For more troubleshooting, see [FAQ.md](FAQ.md)

### Python Virtual Environment Issues

```bash
# If venv activation fails
python3 -m venv venv --clear
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Node Modules Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Docker Issues

```bash
# Check Docker is running
docker ps

# Restart Docker services
docker-compose down
docker-compose up -d

# Rebuild CV service
docker-compose build cv-service --no-cache
```

### Port Already in Use

```bash
# Check what's using port 8000
lsof -i :8000

# Check what's using port 3000
lsof -i :3000

# Check what's using port 8001
lsof -i :8001

# Kill process if needed
kill -9 <PID>
```

### CV Service Not Accessible

```bash
# Check if CV service is running
docker-compose ps cv-service

# Check CV service logs
docker-compose logs cv-service

# Test connectivity
curl http://localhost:8001/health
```

### Missing API Keys

If you see errors about missing providers:
1. Edit `backend/.env`
2. Add at least one LLM API key
3. Restart backend server

### Database Connection Issues

If using databases:
1. Ensure Docker services are running: `docker-compose ps`
2. Check database URLs in `backend/.env`
3. Verify ports are not blocked

## Production Deployment

For production deployment:

1. **Use production WSGI server**:
   ```bash
   pip install gunicorn
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
   ```

2. **Build frontend for production**:
   ```bash
   cd frontend
   npm run build
   # Serve dist/ directory with nginx or similar
   ```

3. **Use environment variables** instead of `.env` files

4. **Set up reverse proxy** (nginx, Traefik, etc.)

5. **Enable HTTPS** with SSL certificates

6. **Set up monitoring** and logging

## Next Steps

After installation:

1. **Read Documentation**:
   - `README.md` - Overview
   - `QUICKSTART.md` - Quick start guide
   - `CV_GUIDE.md` - Computer Vision guide
   - `DOCKER_CV_GUIDE.md` - Docker CV service guide

2. **Configure API Keys**:
   - Edit `backend/.env`
   - Add at least one LLM provider key

3. **Test the Platform**:
   - Try LLM chat features
   - Test object detection
   - Try model training

4. **Customize**:
   - Create training strategies
   - Adjust CV service configuration
   - Customize frontend UI

## Getting Help

- Check logs: `docker-compose logs`
- Review documentation files
- Check API docs: http://localhost:8000/docs
- Verify all services are running

## Uninstallation

To remove everything:

```bash
# Stop all services
docker-compose down

# Remove Docker volumes (optional - removes data)
docker-compose down -v

# Remove Python virtual environment
rm -rf backend/venv

# Remove node modules
rm -rf frontend/node_modules

# Remove Docker images (optional)
docker rmi llm-platform-cv-service
```
