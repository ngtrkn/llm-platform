# Object Detection Component Refactoring

## Overview
The Object Detection component has been refactored to separate logic into classes and files, with YAML configuration support for better maintainability and future adjustments.

## New Structure

### Configuration
- **`public/config/yolo-config.yaml`**: YAML configuration file containing:
  - YOLO model definitions (YOLOv8, YOLOv11, YOLOE-11)
  - UI settings (default confidence, IoU, visualization options)
  - Color schemes for detection classes
  - Drawing and health check settings

### Configuration Manager
- **`src/config/yoloConfig.js`**: Singleton class that loads and manages YAML configuration
  - Loads config from YAML file
  - Provides methods to access models, UI settings, colors, etc.
  - Falls back to default config if YAML loading fails

### Utility Classes
- **`src/utils/colorManager.js`**: Manages colors for detection classes
  - Provides class-specific colors based on configuration
  - Handles opacity adjustments for selected/dimmed states
  - Returns styled objects for boxes and segmentation

- **`src/utils/yoloFormatter.js`**: Handles YOLO format conversion
  - Converts detections to YOLO text format
  - Handles normalization and validation
  - Provides download functionality

- **`src/utils/detectionManager.js`**: CRUD operations for detections
  - Creates, updates, deletes detections
  - Validates bounding boxes
  - Calculates bbox from drawing coordinates

### Custom Hooks
- **`src/hooks/useDetections.js`**: Manages detection state
  - Handles detection CRUD operations
  - Manages selection and editing state
  - Provides clean API for detection management

- **`src/hooks/useImageHandling.js`**: Manages image selection and preview
  - Handles file selection
  - Manages preview URL and image size
  - Provides reset functionality

### UI Components
All components are in `src/components/objectDetection/`:

- **`DetectionVisualization.jsx`**: Renders bounding boxes and segmentation masks
- **`DetectionList.jsx`**: Displays list of detections with edit/delete actions
- **`DetectionEditor.jsx`**: Modal for editing detection properties
- **`SettingsPanel.jsx`**: Settings panel with model selection and parameters
- **`ModelManagement.jsx`**: Model upload/download/delete interface
- **`HealthStatus.jsx`**: CV service health status indicator

### Main Component
- **`src/components/ObjectDetection.jsx`**: Refactored main component
  - Uses custom hooks for state management
  - Uses utility classes for business logic
  - Composes smaller UI components
  - Loads configuration from YAML

## Benefits

1. **Separation of Concerns**: Logic is separated from UI, making code more maintainable
2. **Configuration-Driven**: YAML config allows easy adjustment of models and settings without code changes
3. **Reusability**: Utility classes and hooks can be reused in other components
4. **Testability**: Separated logic is easier to unit test
5. **Scalability**: Easy to add new models or features by updating YAML config
6. **Maintainability**: Smaller, focused components are easier to understand and modify

## Adding New Models

To add a new YOLO model, simply update `public/config/yolo-config.yaml`:

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

## Configuration Options

The YAML config supports:
- Model definitions with metadata
- Default confidence and IoU thresholds
- Visualization settings (show boxes/masks by default)
- Color schemes for classes
- Drawing settings (minimum box size, ID start)
- Health check intervals
- Image display settings

## Migration Notes

- Old component backed up as `ObjectDetection.old.jsx`
- All functionality preserved
- No breaking changes to API
- Configuration is optional - defaults are provided if YAML fails to load
