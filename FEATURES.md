# Platform Features Summary

## Overview

This platform combines LLM (Large Language Model) capabilities with Computer Vision (CV) features in a unified full-stack application.

## LLM Features

### Supported Providers
- **OpenAI**: GPT-3.5, GPT-4, and other OpenAI models
- **Google Gemini**: Gemini Pro and other Gemini models
- **Azure OpenAI**: Azure-hosted OpenAI models

### Database Support
- **PostgreSQL**: Relational database for structured data
- **MongoDB**: Document database for flexible schemas
- **Milvus**: Vector database for embeddings and similarity search

### Features
- Text generation with multiple providers
- Chat completion with conversation history
- Conversation persistence across databases
- Provider abstraction for easy extension

## Computer Vision Features

### Object Detection
- **Real-time Detection**: Upload images and detect objects instantly
- **Multiple Models**: Support for YOLOv8 variants (nano, small, medium, large, xlarge)
- **Custom Models**: Use your own trained models
- **Configurable**: Adjustable confidence thresholds and IoU
- **Batch Processing**: Detect objects in multiple images
- **Visualization**: 
  - **Interactive Bounding Boxes**: Real-time visualization with semi-transparent overlays
  - **Color-Coded Detection**: Each object class displayed in different colors
  - **Confidence Labels**: Class name and confidence percentage displayed on each box
  - **Toggle Visibility**: Show/hide bounding boxes for better image viewing
  - **Download Annotated Images**: Save detection results with bounding boxes
- **Health Monitoring**: Real-time CV service health status indicator (1s refresh rate)

### Model Training
- **Dataset Upload**: Upload datasets in ZIP format
- **Folder Support**: Train from existing dataset folders
- **Fine-tuning**: Fine-tune pre-trained YOLO models
- **Training Management**: Track and manage multiple training projects
- **Resume Training**: Resume from checkpoints
- **Metrics**: View training metrics (mAP50, mAP50-95)

### Architecture
- **Separate Folders**: Inference and training code separated
- **Separate Requirements**: Different dependencies for inference vs training
- **Configurable**: Manual configuration via config files or environment variables
- **CUDA Support**: 
  - **CUDA 12.8+ Compatible**: Support for latest CUDA versions
  - **GPU Acceleration**: Optional GPU support for faster inference and training
  - **Flexible CUDA Version**: Configurable CUDA version via environment variable
  - **Automatic Detection**: CUDA availability verified during build

## Project Structure

```
backend/
├── app/
│   ├── cv/
│   │   ├── inference/      # Object detection inference
│   │   ├── training/       # Model training
│   │   └── config/         # CV configuration
│   ├── api/
│   │   ├── routes.py       # LLM endpoints
│   │   └── cv_routes.py    # CV endpoints
│   └── ...
├── uploads/
│   ├── datasets/           # Training datasets
│   ├── models/             # Trained models
│   └── results/            # Detection results
└── requirements-*.txt     # Separate requirements files
```

## Installation Options

### Minimal (LLM Only)
```bash
pip install -r requirements.txt
```

### Inference Only (CV)
```bash
pip install -r requirements-inference.txt
```

### Full (LLM + CV Training)
```bash
pip install -r requirements.txt
pip install -r requirements-training.txt
```

## API Endpoints

### LLM Endpoints
- `GET /api/v1/providers` - List available providers
- `POST /api/v1/generate` - Generate text
- `POST /api/v1/chat` - Chat completion
- `GET /api/v1/conversations/{db_type}/{user_id}` - List conversations

### CV Endpoints
- `POST /api/v1/cv/detect` - Object detection
- `GET /api/v1/cv/models` - List models
- `POST /api/v1/cv/train` - Train model (upload dataset)
- `POST /api/v1/cv/train/from-folder` - Train model (from folder)
- `GET /api/v1/cv/train/projects` - List training projects

## Frontend Features

### LLM Interface
- Provider selection dropdowns
- Real-time chat interface
- Conversation history sidebar
- Message persistence

### CV Interface
- **Image Upload**: Drag-and-drop or click to upload images
- **Real-time Visualization**: 
  - Interactive bounding boxes with opacity overlay
  - Color-coded detection by object class
  - Confidence scores displayed on each detection
  - Toggle bounding box visibility
- **Health Status Indicator**: 
  - Real-time CV service health monitoring (1s refresh)
  - Visual status indicator (green/red/yellow)
  - Error messages displayed when service is unavailable
  - Last check timestamp
- **Detection Results**: 
  - Detailed detection list with class names and confidence
  - Bounding box coordinates
  - Download annotated images
- **Training Configuration UI**: 
  - Model selection dropdown
  - Training parameter sliders and inputs
  - Dataset upload or folder path input
  - Training project management
- **Model Selection**: Choose from available YOLO models or custom trained models

## Configuration

### LLM Configuration
Edit `backend/.env`:
```env
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key
POSTGRES_HOST=localhost
MONGODB_URL=mongodb://localhost:27017
```

### CV Configuration
Edit `backend/app/cv/config/cv_config.py` or set environment variables:
```env
CV_DEFAULT_MODEL=yolov8n.pt
CV_DEFAULT_EPOCHS=100
CV_DEFAULT_BATCH_SIZE=16
CV_DEFAULT_IMG_SIZE=640
CV_DEFAULT_DEVICE=cpu
```

## Usage Examples

### Object Detection
1. Navigate to "Object Detection" tab
2. Upload an image
3. Select model and adjust settings
4. Click "Detect Objects"
5. View results and download annotated image

### Model Training
1. Navigate to "Model Training" tab
2. Upload dataset ZIP or provide folder path
3. Configure training parameters
4. Click "Start Training"
5. Monitor progress and view results

### LLM Chat
1. Navigate to "LLM Chat" tab
2. Select LLM and database providers
3. Start chatting
4. Conversations are saved automatically

## Documentation

- **README.md**: Main documentation
- **QUICKSTART.md**: Quick start guide
- **CV_GUIDE.md**: Computer Vision detailed guide
- **FEATURES.md**: This file

## Next Steps

1. Configure API keys in `.env`
2. Start backend: `cd backend && ./run.sh`
3. Start frontend: `cd frontend && ./run.sh`
4. Open `http://localhost:3000`
5. Explore LLM and CV features!
