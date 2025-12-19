# AI Platform

A full-stack application with React frontend, Python backend, and support for:
- **LLM Providers**: OpenAI, Gemini, Azure OpenAI
- **Databases**: PostgreSQL, MongoDB, Milvus
- **Computer Vision**: Object Detection with Ultralytics YOLO (inference and training)

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide
- **[FAQ.md](FAQ.md)** - Frequently asked questions and troubleshooting ⭐
- **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Setup verification checklist
- **[FEATURES.md](FEATURES.md)** - Complete feature list
- **[CV_GUIDE.md](CV_GUIDE.md)** - Computer Vision features guide
- **[DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md)** - Docker CV service guide
- **[DOCKER_MIGRATION.md](DOCKER_MIGRATION.md)** - Docker architecture details

## Features

### LLM Features
- **Multiple LLM Providers**: Support for OpenAI, Google Gemini, and Azure OpenAI
- **Multiple Databases**: Support for PostgreSQL, MongoDB, and Milvus (vector database)
- **Conversation Management**: Save and retrieve chat conversations
- **Provider Abstraction**: Easy to add new LLM providers or databases

### Computer Vision Features
- **Object Detection**: 
  - Real-time object detection using Ultralytics YOLO
  - **Interactive Visualization**: Bounding boxes with opacity overlay, color-coded by class
  - **Health Monitoring**: Real-time CV service status indicator (1s refresh)
  - Multiple YOLOv8 models (nano, small, medium, large, xlarge)
- **Model Training**: Fine-tune YOLO models with custom datasets
- **Dataset Management**: Upload datasets in ZIP format or use existing folders
- **CUDA Support**: GPU acceleration with CUDA 12.8+ compatibility
- **Separate Requirements**: Different dependencies for inference and training
- **Configurable**: Adjustable confidence thresholds, IoU, and training parameters

## Project Structure

```
llm-platform/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes.py          # LLM API endpoints
│   │   │   └── cv_routes.py       # Computer Vision API endpoints
│   │   ├── cv/
│   │   │   ├── inference/         # Object detection inference
│   │   │   │   └── detector.py
│   │   │   ├── training/          # Model training
│   │   │   │   └── trainer.py
│   │   │   └── config/             # CV configuration
│   │   │       └── cv_config.py
│   │   ├── core/
│   │   │   └── config.py           # Configuration management
│   │   ├── models/
│   │   │   └── schemas.py          # Pydantic models
│   │   ├── services/
│   │   │   ├── llm_service.py      # LLM provider abstraction
│   │   │   └── database_service.py # Database provider abstraction
│   │   └── main.py                 # FastAPI application
│   ├── uploads/
│   │   ├── datasets/               # Training datasets
│   │   ├── models/                 # Trained models
│   │   └── results/                 # Detection results
│   ├── requirements.txt            # Core + LLM dependencies
│   ├── requirements-inference.txt  # Inference-only dependencies
│   ├── requirements-training.txt   # Training dependencies
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/             # React components
│   │   │   ├── ObjectDetection.jsx
│   │   │   └── ModelTraining.jsx
│   │   ├── services/               # API clients
│   │   │   ├── api.js
│   │   │   └── cvApi.js
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Quick Start

### Automated Installation (Recommended)

The easiest way to get started:

```bash
# Make installation script executable
chmod +x install.sh

# Run installation script
./install.sh

# Edit configuration
nano backend/.env  # Add your API keys

# Start all services
./start-all.sh
```

The installation script will:
- ✅ Check prerequisites
- ✅ Set up Python virtual environment
- ✅ Install all dependencies
- ✅ Build Docker images
- ✅ Create startup scripts
- ✅ Configure environment files

### Manual Installation

For detailed manual installation steps, see [INSTALLATION.md](INSTALLATION.md)

**Quick manual setup:**

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# Frontend
cd ../frontend
npm install

# CV Service (Docker)
docker-compose build cv-service
```

## Setup Details

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
# For LLM features only
pip install -r requirements.txt

# Note: CV dependencies are in Docker service, not main backend
```

4. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

5. Edit `.env` with your credentials (at minimum, add one LLM API key):
```env
OPENAI_API_KEY=your_key_here
# OR
GEMINI_API_KEY=your_key_here
# OR
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_key_here
```

6. Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with docs at `http://localhost:8000/docs`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

### CV Service Setup (Docker)

The CV service runs in a separate Docker container:

```bash
# Build CV service
docker-compose build cv-service

# Start CV service (with databases)
docker-compose up -d
```

See [DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md) for detailed CV service documentation.

## Database Setup

### PostgreSQL

```bash
# Using Docker
docker run --name postgres-llm -e POSTGRES_PASSWORD=your_password -e POSTGRES_DB=llm_platform -p 5432:5432 -d postgres

# Or install locally and create database
createdb llm_platform
```

### MongoDB

```bash
# Using Docker
docker run --name mongodb-llm -p 27017:27017 -d mongo

# Or install locally
mongod
```

### Milvus

```bash
# Using Docker Compose (recommended)
# Download docker-compose.yml from Milvus documentation
docker-compose up -d

# Or using standalone Docker
docker run -d --name milvus-standalone -p 19530:19530 -p 9091:9091 milvusdb/milvus:latest
```

## API Endpoints

### Get Available Providers
```
GET /api/v1/providers
```

### Generate Text
```
POST /api/v1/generate
Body: {
  "provider": "openai",
  "prompt": "Hello, world!",
  "model": "gpt-3.5-turbo",
  "temperature": 0.7
}
```

### Chat Completion
```
POST /api/v1/chat
Body: {
  "provider": "openai",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "save_to_db": true,
  "db_type": "mongodb"
}
```

### List Conversations
```
GET /api/v1/conversations/{db_type}/{user_id}?limit=10
```

### Get Conversation
```
GET /api/v1/conversations/{db_type}/{conversation_id}
```

## Computer Vision API Endpoints

### Object Detection
```
POST /api/v1/cv/detect
Content-Type: multipart/form-data
Body:
  - file: (image file)
  - model: (optional, default: yolov8n.pt)
  - confidence: (optional, default: 0.25)
  - iou: (optional, default: 0.45)
  - save_result: (optional, default: true)
```

### List Available Models
```
GET /api/v1/cv/models
```

### Get Model Info
```
GET /api/v1/cv/models/{model_name}/info
```

### Train Model (Upload Dataset)
```
POST /api/v1/cv/train
Content-Type: multipart/form-data
Body:
  - dataset: (ZIP file with YOLO format dataset)
  - base_model: (default: yolov8n.pt)
  - epochs: (default: 100)
  - batch_size: (default: 16)
  - img_size: (default: 640)
  - device: (cpu/cuda/mps, default: cpu)
  - project_name: (optional)
```

### Train Model (From Folder)
```
POST /api/v1/cv/train/from-folder
Params:
  - dataset_path: (path to dataset folder)
  - base_model: (default: yolov8n.pt)
  - epochs: (default: 100)
  - batch_size: (default: 16)
  - img_size: (default: 640)
  - device: (cpu/cuda/mps, default: cpu)
  - project_name: (optional)
```

### List Training Projects
```
GET /api/v1/cv/train/projects
```

### Get Training Project
```
GET /api/v1/cv/train/projects/{project_name}
```

### Resume Training
```
POST /api/v1/cv/train/resume
Params:
  - checkpoint_path: (path to checkpoint .pt file)
  - epochs: (optional, additional epochs)
```

## Usage

1. Start the backend server
2. Start the frontend development server
3. Open `http://localhost:3000` in your browser

### LLM Features
- Select an LLM provider and database provider from the dropdowns
- Start chatting! Conversations can be saved to the selected database

### Computer Vision Features
- **Object Detection**: Upload an image and detect objects using YOLO models
- **Model Training**: Upload a dataset (ZIP) or provide a folder path to train custom models
- **Training Management**: View all training projects and their results

## Adding New Providers

### Adding a New LLM Provider

1. Create a new class inheriting from `LLMProvider` in `backend/app/services/llm_service.py`
2. Implement `generate()` and `chat()` methods
3. Register it in `LLMService._initialize_providers()`

### Adding a New Database Provider

1. Create a new class inheriting from `DatabaseProvider` in `backend/app/services/database_service.py`
2. Implement required methods
3. Register it in `DatabaseService._initialize_providers()`

## Environment Variables

See `.env.example` for all available configuration options. At minimum, you need to configure at least one LLM provider API key and one database.

## License

MIT
