/**
 * Detection Manager
 * Handles CRUD operations for detections
 */

class DetectionManager {
  constructor(nextIdStart = 1000) {
    this.nextId = nextIdStart;
  }

  /**
   * Initialize next ID from existing detections
   */
  initializeNextId(detections) {
    if (!detections || detections.length === 0) {
      return;
    }
    const maxId = Math.max(...detections.map(d => d.id || 0), 0);
    this.nextId = Math.max(maxId + 1, this.nextId);
  }

  /**
   * Process detections from API response
   */
  processDetections(detections) {
    if (!detections || !Array.isArray(detections)) {
      return [];
    }

    return detections.map(d => ({
      ...d,
      segmentation: d.segmentation || {
        polygon: [],
        mask_available: false
      }
    }));
  }

  /**
   * Create a new detection
   */
  createDetection(bbox, classId = 0, className = 'object', confidence = 0.5) {
    const detection = {
      id: this.nextId++,
      class_id: classId,
      class_name: className,
      confidence: confidence,
      bbox: {
        x1: bbox.x1,
        y1: bbox.y1,
        x2: bbox.x2,
        y2: bbox.y2,
        width: Math.abs(bbox.x2 - bbox.x1),
        height: Math.abs(bbox.y2 - bbox.y1)
      },
      segmentation: {
        polygon: [],
        mask_available: false
      }
    };

    return detection;
  }

  /**
   * Update an existing detection
   */
  updateDetection(detections, detectionId, updates) {
    return detections.map(d => 
      d.id === detectionId 
        ? { ...d, ...updates }
        : d
    );
  }

  /**
   * Delete a detection
   */
  deleteDetection(detections, detectionId) {
    return detections.filter(d => d.id !== detectionId);
  }


  /**
   * Calculate bbox from drawing coordinates
   */
  calculateBboxFromDrawing(drawStart, drawEnd, imageRef) {
    if (!drawStart || !drawEnd || !imageRef.current) {
      return null;
    }

    const x1 = Math.min(drawStart.x, drawEnd.x);
    const y1 = Math.min(drawStart.y, drawEnd.y);
    const x2 = Math.max(drawStart.x, drawEnd.x);
    const y2 = Math.max(drawStart.y, drawEnd.y);

    // Check minimum size
    if (Math.abs(x2 - x1) < 10 || Math.abs(y2 - y1) < 10) {
      return null;
    }

    return {
      x1,
      y1,
      x2,
      y2,
      width: x2 - x1,
      height: y2 - y1
    };
  }
}

export default DetectionManager;
