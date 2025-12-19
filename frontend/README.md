# Frontend - Object Detection Component

## Overview

The Object Detection component has been refactored into a modular, maintainable architecture with YAML configuration support.

## Architecture

### Component Structure

```
frontend/src/
├── components/
│   ├── objectDetection/
│   │   ├── DetectionVisualization.jsx  # Renders boxes and masks
│   │   ├── DetectionList.jsx           # Detection list with actions
│   │   ├── DetectionEditor.jsx         # Edit detection modal
│   │   ├── SettingsPanel.jsx           # Settings panel
│   │   ├── ModelManagement.jsx         # Model upload/download/delete
│   │   └── HealthStatus.jsx             # Health status indicator
│   └── ObjectDetection.jsx              # Main component
├── config/
│   └── yoloConfig.js                    # YAML config loader
├── hooks/
│   ├── useDetections.js                 # Detection state management
│   └── useImageHandling.js              # Image handling
├── utils/
│   ├── colorManager.js                  # Color management
│   ├── yoloFormatter.js                 # YOLO format conversion
│   └── detectionManager.js              # Detection CRUD operations
└── services/
    └── cvApi.js                          # CV API client
```

### Configuration

**File**: `public/config/yolo-config.yaml`

This YAML file contains:
- YOLO model definitions (YOLOv8, YOLOv11, YOLOE-11)
- UI settings (default confidence, IoU, visualization)
- Color schemes for detection classes
- Drawing and health check settings

**To add a new model**, simply update the YAML file - no code changes needed!

## Features

### Detection Management
- ✅ Create detections by drawing bounding boxes
- ✅ Edit detection properties (class, confidence, bbox)
- ✅ Delete detections
- ✅ Select detections with visual highlighting
- ✅ Download YOLO format annotations

### Visualization
- ✅ Bounding boxes with color coding
- ✅ Segmentation masks/polygons
- ✅ Toggle boxes/masks visibility
- ✅ Selection highlighting (selected bright, others dimmed)
- ✅ Confidence labels

### Model Management
- ✅ Upload custom models
- ✅ Download models
- ✅ Delete custom models
- ✅ View available models

### Configuration
- ✅ YAML-based configuration
- ✅ Easy model addition
- ✅ Customizable colors and settings
- ✅ Fallback defaults if YAML fails

## Installation

### Dependencies

The component requires `js-yaml` for YAML parsing:

```bash
npm install
# js-yaml is automatically installed via package.json
```

### Configuration Setup

1. **Default Configuration**: Already included in `public/config/yolo-config.yaml`
2. **Customize**: Edit the YAML file to add models or change settings
3. **No Code Changes**: Configuration changes don't require code modifications

## Usage

### Basic Usage

```jsx
import ObjectDetection from './components/ObjectDetection';

function App() {
  return <ObjectDetection />;
}
```

### Customization

1. **Add New Models**: Edit `public/config/yolo-config.yaml`
2. **Change Colors**: Update color arrays in YAML config
3. **Adjust Defaults**: Modify default confidence/IoU in YAML

## Development

### Component Structure

- **Main Component** (`ObjectDetection.jsx`): Orchestrates all sub-components
- **Hooks**: Manage state (detections, images)
- **Utils**: Business logic (formatting, CRUD, colors)
- **Sub-components**: Focused UI components

### Adding Features

1. **New Detection Feature**: Add to `useDetections` hook or `detectionManager`
2. **New Visualization**: Update `DetectionVisualization` component
3. **New Model Type**: Add to YAML config

## API Integration

The component uses `cvApi.js` for backend communication:

- `detectObjects()` - Run object detection
- `listModels()` - Get available models
- `uploadModel()` - Upload custom model
- `downloadModel()` - Download model
- `deleteModel()` - Delete model
- `checkCVServiceHealth()` - Check service status

## Configuration Reference

See `public/config/yolo-config.yaml` for full configuration options:

- **Models**: Define model metadata
- **UI Settings**: Default thresholds, visualization options
- **Colors**: Class color schemes
- **Drawing**: Drawing settings (min size, ID start)
- **Health Check**: Polling interval

## Migration Notes

- Old component backed up as `ObjectDetection.old.jsx`
- All features preserved
- No breaking changes
- Configuration is optional (defaults provided)

## Troubleshooting

### YAML Config Not Loading
- Check browser console for errors
- Verify `public/config/yolo-config.yaml` exists
- Component falls back to defaults if YAML fails

### Models Not Appearing
- Check CV service is running
- Verify models are downloaded in Docker container
- Check `docker-compose logs cv-service`

### Detection Not Working
- Verify CV service health status
- Check network connectivity
- Review browser console for errors

## Documentation

- **[REFACTORING.md](REFACTORING.md)** - Detailed refactoring documentation
- **[../CV_GUIDE.md](../CV_GUIDE.md)** - Computer Vision guide
- **[../README.md](../README.md)** - Main project README
