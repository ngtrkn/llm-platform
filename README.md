# AI Platform

A full-stack application with React frontend, Python backend, and support for:
- **LLM Providers**: OpenAI, Gemini, Azure OpenAI
- **Databases**: PostgreSQL, MongoDB, Milvus
- **Computer Vision**: Object Detection with Ultralytics YOLO (YOLOv8, YOLOv11, YOLOE-11) - inference, training, and interactive annotation

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[INSTALLATION.md](INSTALLATION.md)** - Complete installation guide
- **[FAQ.md](FAQ.md)** - Frequently asked questions and troubleshooting ⭐
- **[SETUP_CHECKLIST.md](SETUP_CHECKLIST.md)** - Setup verification checklist
- **[FEATURES.md](FEATURES.md)** - Complete feature list
- **[CV_GUIDE.md](CV_GUIDE.md)** - Computer Vision features guide
- **[DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md)** - Docker CV service guide
- **[DOCKER_MIGRATION.md](DOCKER_MIGRATION.md)** - Docker architecture details
- **[frontend/REFACTORING.md](frontend/REFACTORING.md)** - Object Detection component architecture

## Features

### LLM Features
- **Multiple LLM Providers**: Support for OpenAI, Google Gemini, and Azure OpenAI
- **Multiple Databases**: Support for PostgreSQL, MongoDB, and Milvus (vector database)
- **Conversation Management**: Save and retrieve chat conversations
- **Provider Abstraction**: Easy to add new LLM providers or databases

### Computer Vision Features

#### Object Detection
- **Multiple YOLO Models**: 
  - YOLOv8 (nano, small, medium, large, xlarge)
  - YOLOv11 (nano, small, medium, large, xlarge) ⭐ NEW
  - YOLOE-11 (nano, small, medium, large, xlarge) ⭐ NEW
- **Interactive Annotation**:
  - **CRUD Operations**: Create, edit, and delete detections directly in the UI
  - **Manual Drawing**: Draw bounding boxes manually on images
  - **Detection Selection**: Click to select and highlight detections
  - **Visual Feedback**: Selected detections highlighted, others dimmed
- **Segmentation Support**: Display object masks/polygons in addition to bounding boxes
- **YOLO Format Export**: Download annotations in YOLO text format (`class_id center_x center_y width height`)
- **Visualization**:
  - Interactive bounding boxes with opacity overlay
  - Color-coded by object class
  - Confidence scores displayed
  - Toggle boxes and masks visibility
- **Model Management**: Upload, download, and delete custom models
- **Health Monitoring**: Real-time CV service status indicator (1s refresh)
- **YAML Configuration**: Easy model and UI customization via `frontend/public/config/yolo-config.yaml`

#### Model Training
- Fine-tune YOLO models with custom datasets
- Dataset management (ZIP upload or folder paths)
- CUDA support with GPU acceleration
- Training project management

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
│   │   │   ├── database_service.py # Database provider abstraction
│   │   │   └── cv_client.py        # CV service client
│   │   └── main.py                 # FastAPI application
│   ├── cv-service/                 # Docker CV service
│   │   ├── main.py
│   │   ├── inference/
│   │   ├── training/
│   │   ├── download_models.py      # Model download script
│   │   └── Dockerfile
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
│   │   ├── components/
│   │   │   ├── objectDetection/    # Refactored Object Detection components
│   │   │   │   ├── DetectionVisualization.jsx
│   │   │   │   ├── DetectionList.jsx
│   │   │   │   ├── DetectionEditor.jsx
│   │   │   │   ├── SettingsPanel.jsx
│   │   │   │   ├── ModelManagement.jsx
│   │   │   │   └── HealthStatus.jsx
│   │   │   ├── ObjectDetection.jsx # Main component
│   │   │   └── ModelTraining.jsx
│   │   ├── config/
│   │   │   └── yoloConfig.js       # YAML config loader
│   │   ├── hooks/
│   │   │   ├── useDetections.js    # Detection state management
│   │   │   └── useImageHandling.js # Image handling
│   │   ├── utils/
│   │   │   ├── colorManager.js     # Color management
│   │   │   ├── yoloFormatter.js    # YOLO format conversion
│   │   │   └── detectionManager.js # Detection CRUD operations
│   │   ├── services/               # API clients
│   │   │   ├── api.js
│   │   │   └── cvApi.js
│   │   └── App.jsx
│   ├── public/
│   │   └── config/
│   │       └── yolo-config.yaml    # YOLO model configuration
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Quick Start

### Automated Installation (Recommended)

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
- ✅ Install all dependencies (including frontend js-yaml)
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
npm install  # Installs js-yaml automatically
# YAML config is already included in public/config/

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
# This automatically installs js-yaml for YAML config parsing
```

3. **Configure YOLO Models** (Optional):
   - Edit `public/config/yolo-config.yaml` to customize models and UI settings
   - Default configuration includes all YOLOv8, YOLOv11, and YOLOE-11 models

4. Start the development server:
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

**Model Download**: Models are automatically downloaded on first container start. Default models include:
- YOLOv8 (nano, small, medium, large, xlarge)
- YOLOv11 (nano, small, medium, large, xlarge)
- YOLOE-11 (nano, small, medium, large, xlarge)

See [DOCKER_CV_GUIDE.md](DOCKER_CV_GUIDE.md) for detailed CV service documentation.

## Object Detection Features

### Interactive Annotation
1. **Upload Image**: Click "Choose Image" or drag and drop
2. **Detect Objects**: Click "Detect Objects" to run detection
3. **Create Detection**: Click "Add Detection" and draw bounding box
4. **Edit Detection**: Click on detection box or in the list to edit
5. **Delete Detection**: Click trash icon in detection list
6. **Select Detection**: Click on detection to highlight it
7. **Download YOLO**: Click "Download YOLO Annotation (.txt)" to export

### Model Management
- **Upload Custom Models**: Upload `.pt` files via Settings → Manage Models
- **Download Models**: Download models for offline use
- **Delete Models**: Remove custom models

### Configuration
Edit `frontend/public/config/yolo-config.yaml` to:
- Add new YOLO models
- Change default confidence/IoU thresholds
- Customize color schemes
- Adjust visualization settings

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
  - model: (optional, default: yolo11n.pt)
  - confidence: (optional, default: 0.25)
  - iou: (optional, default: 0.45)
  - save_result: (optional, default: true)
```

### List Available Models
```
GET /api/v1/cv/models
```

### Upload Model
```
POST /api/v1/cv/models/upload
Content-Type: multipart/form-data
Body:
  - file: (model .pt file)
  - name: (optional model name)
```

### Download Model
```
GET /api/v1/cv/models/{model_name}/download
```

### Delete Model
```
DELETE /api/v1/cv/models/{model_name}
```

### Get Model Status
```
GET /api/v1/cv/models/{model_name}/status
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

## Usage

1. Start the backend server
2. Start the frontend development server
3. Start Docker services (CV service + databases)
4. Open `http://localhost:3000` in your browser

### LLM Features
- Select an LLM provider and database provider from the dropdowns
- Start chatting! Conversations can be saved to the selected database

### Computer Vision Features
- **Object Detection**: Upload an image, detect objects, create/edit detections, download YOLO annotations
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

### Adding a New YOLO Model

Simply edit `frontend/public/config/yolo-config.yaml`:

```yaml
models:
  new_model:
    name: "new_model.pt"
    display_name: "New Model"
    family: "yolo11"
    size: "medium"
    description: "Description here"
    default: false
```

The model will automatically appear in the UI without code changes.

## Environment Variables

See `.env.example` for all available configuration options. At minimum, you need to configure at least one LLM provider API key and one database.

## License

MIT
