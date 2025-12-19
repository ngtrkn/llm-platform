# Computer Vision Guide

This guide explains how to use the Computer Vision features of the platform, including object detection and model training.

## Dataset Format

The platform expects datasets in YOLO format. Your dataset should be structured as follows:

```
dataset/
├── images/
│   ├── train/          # Training images
│   │   ├── img1.jpg
│   │   ├── img2.jpg
│   │   └── ...
│   ├── val/            # Validation images
│   │   ├── img1.jpg
│   │   └── ...
│   └── test/           # Test images (optional)
│       └── ...
└── labels/
    ├── train/          # Training labels (YOLO format)
    │   ├── img1.txt
    │   ├── img2.txt
    │   └── ...
    ├── val/            # Validation labels
    │   ├── img1.txt
    │   └── ...
    └── test/           # Test labels (optional)
        └── ...
```

### YOLO Label Format

Each label file (`.txt`) should contain one line per object:
```
class_id center_x center_y width height
```

Where:
- `class_id`: Integer class ID (0, 1, 2, ...)
- `center_x`, `center_y`: Normalized coordinates (0-1) of bounding box center
- `width`, `height`: Normalized width and height (0-1)

Example:
```
0 0.5 0.5 0.3 0.4
1 0.2 0.3 0.1 0.2
```

## Object Detection

### Using the UI

1. Navigate to the "Object Detection" tab
2. Click "Choose Image" to upload an image
3. Adjust settings (model, confidence, IoU) if needed
4. Click "Detect Objects"
5. View results and download annotated image

### Using the API

```bash
curl -X POST http://localhost:8000/api/v1/cv/detect \
  -F "file=@image.jpg" \
  -F "model=yolov8n.pt" \
  -F "confidence=0.25" \
  -F "iou=0.45"
```

## Model Training

### Preparing Your Dataset

1. Organize your dataset in YOLO format (see above)
2. Create a ZIP file containing the entire dataset folder
3. Ensure image and label files have matching names (different extensions)

### Training via UI

1. Navigate to the "Model Training" tab
2. Choose training mode:
   - **Upload Dataset**: Upload a ZIP file
   - **Use Existing Folder**: Provide a path to an existing dataset folder
3. Configure training parameters:
   - **Base Model**: Choose YOLOv8 variant (nano, small, medium, large, xlarge)
   - **Epochs**: Number of training epochs (default: 100)
   - **Batch Size**: Batch size for training (default: 16)
   - **Image Size**: Input image size (default: 640)
   - **Device**: CPU, CUDA (GPU), or MPS (Apple Silicon)
   - **Project Name**: Optional custom name
4. Click "Start Training"
5. Monitor training progress and view results

### Training via API

```bash
# Upload dataset ZIP
curl -X POST http://localhost:8000/api/v1/cv/train \
  -F "dataset=@dataset.zip" \
  -F "base_model=yolov8n.pt" \
  -F "epochs=100" \
  -F "batch_size=16" \
  -F "img_size=640" \
  -F "device=cpu"

# Or use existing folder
curl -X POST "http://localhost:8000/api/v1/cv/train/from-folder?dataset_path=/path/to/dataset&epochs=100"
```

### Training Configuration

You can modify training parameters by editing `backend/app/cv/config/cv_config.py`:

```python
DEFAULT_MODEL: str = "yolov8n.pt"
DEFAULT_EPOCHS: int = 100
DEFAULT_BATCH_SIZE: int = 16
DEFAULT_IMG_SIZE: int = 640
DEFAULT_DEVICE: str = "cpu"
```

Or set them via environment variables in `.env`:
```env
CV_DEFAULT_MODEL=yolov8s.pt
CV_DEFAULT_EPOCHS=200
CV_DEFAULT_BATCH_SIZE=32
CV_DEFAULT_IMG_SIZE=640
CV_DEFAULT_DEVICE=cuda
```

## Model Management

### Available Models

The platform supports:
- **Default Models**: YOLOv8n, YOLOv8s, YOLOv8m, YOLOv8l, YOLOv8x
- **Custom Models**: Upload trained models to `backend/uploads/models/`

### Using Trained Models

After training, your model will be saved at:
```
uploads/models/trained/{project_name}/train/weights/best.pt
```

To use a trained model for inference:
1. Copy the model to `uploads/models/` or use the full path
2. Select the model in the Object Detection UI
3. Or specify the model path in API calls

## Inference vs Training Requirements

### Inference Only
Install minimal dependencies:
```bash
pip install -r requirements-inference.txt
```

### Training
Install full dependencies (includes inference):
```bash
pip install -r requirements-training.txt
```

## Tips

1. **Dataset Quality**: Ensure high-quality, diverse images with accurate labels
2. **Train/Val Split**: Recommended 80/20 split for train/validation
3. **Batch Size**: Adjust based on GPU memory (larger = faster but more memory)
4. **Image Size**: Larger images = better accuracy but slower training
5. **Epochs**: Monitor validation metrics to avoid overfitting
6. **Device**: Use GPU (CUDA) for faster training if available

## Troubleshooting

### Dataset Validation Errors
- Ensure folder structure matches YOLO format exactly
- Check that image and label filenames match (excluding extension)
- Verify label files contain valid YOLO format coordinates

### Training Errors
- Check GPU availability: `nvidia-smi` (for CUDA)
- Reduce batch size if running out of memory
- Ensure dataset has at least 2 classes

### Inference Errors
- Verify model file exists and is valid
- Check image format is supported (jpg, png, etc.)
- Ensure confidence threshold is reasonable (0.1-0.9)
