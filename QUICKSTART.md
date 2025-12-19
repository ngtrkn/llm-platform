# Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites Check

Make sure you have:
- ✅ Python 3.8+
- ✅ Node.js 16+
- ✅ Docker (for CV features)

Check versions:
```bash
python3 --version
node --version
docker --version
```

## Installation

### Step 1: Run Installation Script

```bash
chmod +x install.sh
./install.sh
```

This will:
- Set up Python virtual environment
- Install all dependencies
- Build Docker images
- Create startup scripts

### Step 2: Configure API Keys

Edit `backend/.env` and add at least one LLM API key:

```bash
nano backend/.env
```

Minimum configuration:
```env
OPENAI_API_KEY=sk-your-key-here
```

Or use Gemini:
```env
GEMINI_API_KEY=your-key-here
```

### Step 3: Start Services

**Option A: Start Everything (Easiest)**
```bash
./start-all.sh
```

**Option B: Start Separately**
```bash
# Terminal 1: Docker services
docker-compose up -d

# Terminal 2: Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Terminal 3: Frontend
cd frontend && npm run dev
```

## Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **CV Service**: http://localhost:8001

## First Steps

### 1. Test LLM Chat

1. Open http://localhost:3000
2. Go to "LLM Chat" tab
3. Select a provider (OpenAI, Gemini, etc.)
4. Start chatting!

### 2. Test Object Detection

1. Go to "Object Detection" tab
2. Upload an image
3. Click "Detect Objects"
4. View results

### 3. Test Model Training

1. Go to "Model Training" tab
2. Upload a dataset (ZIP file in YOLO format)
3. Configure training parameters
4. Click "Start Training"

## Common Issues

### Port Already in Use

```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn app.main:app --port 8001
```

### Docker Not Running

```bash
# Start Docker Desktop or Docker daemon
# Then restart services
docker-compose up -d
```

### Missing API Keys

Make sure you've added at least one LLM API key to `backend/.env`:
- OpenAI: Get key from https://platform.openai.com/api-keys
- Gemini: Get key from https://makersuite.google.com/app/apikey
- Azure: Get from Azure Portal

### CV Service Not Accessible

```bash
# Check if running
docker-compose ps cv-service

# Check logs
docker-compose logs cv-service

# Restart
docker-compose restart cv-service
```

## Next Steps

- 📖 Read [INSTALLATION.md](INSTALLATION.md) for detailed setup
- 📖 Read [README.md](README.md) for feature overview
- 📖 Read [CV_GUIDE.md](CV_GUIDE.md) for CV features
- 📖 Read [DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md) for Docker setup

## Stopping Services

```bash
# Stop all services
Ctrl+C  # If using start-all.sh

# Or stop Docker services
docker-compose down
```

## Getting Help

- Check logs: `docker-compose logs`
- Check API docs: http://localhost:8000/docs
- Review documentation files
- Verify all services are running: `docker-compose ps`
