/**
 * YOLO Format Converter
 * Handles conversion between detection format and YOLO annotation format
 */

class YOLOFormatter {
  /**
   * Convert detection bounding box to YOLO format
   * YOLO format: class_id center_x center_y width height (all normalized 0-1)
   */
  static convertToYOLOFormat(detection, imageWidth, imageHeight) {
    if (!detection.bbox || !imageWidth || !imageHeight) {
      throw new Error('Invalid detection or image dimensions');
    }

    const { bbox, class_id } = detection;
    
    // Ensure x2 > x1 and y2 > y1
    const x1 = Math.min(bbox.x1, bbox.x2);
    const x2 = Math.max(bbox.x1, bbox.x2);
    const y1 = Math.min(bbox.y1, bbox.y2);
    const y2 = Math.max(bbox.y1, bbox.y2);
    
    // Convert from absolute coordinates to normalized YOLO format
    const center_x = ((x1 + x2) / 2) / imageWidth;
    const center_y = ((y1 + y2) / 2) / imageHeight;
    const width = (x2 - x1) / imageWidth;
    const height = (y2 - y1) / imageHeight;

    // Ensure values are within [0, 1] range
    const normalized_center_x = Math.max(0, Math.min(1, center_x));
    const normalized_center_y = Math.max(0, Math.min(1, center_y));
    const normalized_width = Math.max(0, Math.min(1, width));
    const normalized_height = Math.max(0, Math.min(1, height));

    // YOLO format: class_id center_x center_y width height
    return `${class_id} ${normalized_center_x.toFixed(6)} ${normalized_center_y.toFixed(6)} ${normalized_width.toFixed(6)} ${normalized_height.toFixed(6)}`;
  }

  /**
   * Convert multiple detections to YOLO format
   */
  static convertDetectionsToYOLO(detections, imageWidth, imageHeight) {
    if (!detections || detections.length === 0) {
      throw new Error('No detections available');
    }

    if (!imageWidth || !imageHeight || imageWidth <= 0 || imageHeight <= 0) {
      throw new Error('Invalid image dimensions');
    }

    const yoloLines = detections.map((detection, index) => {
      try {
        return this.convertToYOLOFormat(detection, imageWidth, imageHeight);
      } catch (error) {
        throw new Error(`Invalid detection data at index ${index}: ${error.message}`);
      }
    });

    return yoloLines.join('\n');
  }

  /**
   * Convert YOLO format back to detection format
   */
  static convertFromYOLOFormat(yoloLine, imageWidth, imageHeight) {
    const parts = yoloLine.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid YOLO format: expected 5 values');
    }

    const class_id = parseInt(parts[0]);
    const center_x = parseFloat(parts[1]);
    const center_y = parseFloat(parts[2]);
    const width = parseFloat(parts[3]);
    const height = parseFloat(parts[4]);

    // Convert from normalized to absolute coordinates
    const abs_center_x = center_x * imageWidth;
    const abs_center_y = center_y * imageHeight;
    const abs_width = width * imageWidth;
    const abs_height = height * imageHeight;

    const x1 = abs_center_x - abs_width / 2;
    const y1 = abs_center_y - abs_height / 2;
    const x2 = abs_center_x + abs_width / 2;
    const y2 = abs_center_y + abs_height / 2;

    return {
      class_id,
      bbox: {
        x1,
        y1,
        x2,
        y2,
        width: abs_width,
        height: abs_height
      }
    };
  }

  /**
   * Download YOLO annotation file
   */
  static downloadYOLOAnnotation(detections, imageWidth, imageHeight, filename) {
    try {
      const yoloContent = this.convertDetectionsToYOLO(detections, imageWidth, imageHeight);
      
      // Get filename without extension
      const fileNameWithoutExt = filename.replace(/\.[^/.]+$/, '');
      const yoloFileName = `${fileNameWithoutExt}.txt`;

      // Create a blob and download
      const blob = new Blob([yoloContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = yoloFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading YOLO annotation:', error);
      throw error;
    }
  }
}

export default YOLOFormatter;
