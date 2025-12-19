import { useRef, useEffect } from 'react';
import ColorManager from '../../utils/colorManager';

/**
 * Detection Visualization Component
 * Renders bounding boxes and segmentation masks on the image
 */
export default function DetectionVisualization({
  imageRef,
  detections,
  showBoundingBoxes,
  showSegmentation,
  selectedDetectionId,
  colorManager,
  isDrawing,
  drawStart,
  drawEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDetectionClick,
  isCreatingDetection
}) {
  const containerRef = useRef(null);

  if (!detections || detections.length === 0 || !imageRef.current) {
    return null;
  }

  const img = imageRef.current;
  if (!img.naturalWidth || !img.naturalHeight) {
    return null;
  }

  const imgNaturalWidth = img.naturalWidth;
  const imgNaturalHeight = img.naturalHeight;
  const displayWidth = img.offsetWidth;
  const displayHeight = img.offsetHeight;
  const scaleX = displayWidth / imgNaturalWidth;
  const scaleY = displayHeight / imgNaturalHeight;

  return (
    <div 
      ref={containerRef}
      className="absolute top-0 left-0"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        pointerEvents: isCreatingDetection ? 'none' : 'auto'
      }}
    >
      {/* SVG for segmentation polygons */}
      {showSegmentation && (
        <svg
          className="absolute top-0 left-0"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`
          }}
        >
          {detections.map((detection, idx) => {
            const hasSegmentation = detection.segmentation && 
              detection.segmentation.mask_available && 
              detection.segmentation.polygon && 
              detection.segmentation.polygon.length > 0;
            
            if (!hasSegmentation) return null;
            
            const polygonPoints = detection.segmentation.polygon
              .map(point => `${point[0] * scaleX},${point[1] * scaleY}`)
              .join(' ');
            
            const isSelected = selectedDetectionId === detection.id;
            const isDimmed = selectedDetectionId !== null && !isSelected;
            const styles = colorManager.getSegmentationStyles(
              detection.class_id,
              isSelected,
              isDimmed
            );
            
            return (
              <polygon
                key={`seg-${detection.id || idx}`}
                points={polygonPoints}
                fill={styles.fill}
                stroke={styles.stroke}
                strokeWidth={styles.strokeWidth}
                opacity={styles.opacity}
                style={{
                  transition: 'all 0.3s ease',
                }}
              />
            );
          })}
        </svg>
      )}
      
      {/* Bounding boxes */}
      {showBoundingBoxes && (
        <>
          {detections.map((detection, idx) => {
            const x1 = detection.bbox.x1 * scaleX;
            const y1 = detection.bbox.y1 * scaleY;
            const x2 = detection.bbox.x2 * scaleX;
            const y2 = detection.bbox.y2 * scaleY;
            const width = x2 - x1;
            const height = y2 - y1;
            
            const isSelected = selectedDetectionId === detection.id;
            const isDimmed = selectedDetectionId !== null && !isSelected;
            const styles = colorManager.getBoxStyles(
              detection.class_id,
              isSelected,
              isDimmed
            );
            
            const boxShadow = isSelected
              ? `0 0 0 2px ${styles.borderColor}, 0 0 15px rgba(0,0,0,0.5)`
              : `0 0 0 1px ${styles.borderColor}`;
            
            return (
              <div
                key={detection.id || idx}
                className="absolute"
                style={{
                  left: `${x1}px`,
                  top: `${y1}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  border: `${styles.borderWidth} solid ${styles.borderColor}`,
                  backgroundColor: styles.backgroundColor,
                  borderRadius: '4px',
                  boxShadow: boxShadow,
                  transition: 'all 0.3s ease',
                  opacity: styles.opacity,
                  zIndex: isSelected ? 30 : 10,
                  pointerEvents: isCreatingDetection ? 'none' : 'auto',
                  cursor: isCreatingDetection ? 'default' : 'pointer',
                }}
                onClick={(e) => {
                  if (!isCreatingDetection && onDetectionClick) {
                    e.stopPropagation();
                    onDetectionClick(detection.id);
                  }
                }}
              >
                <div
                  className="absolute -top-7 left-0 px-2 py-1 text-xs font-semibold text-white rounded shadow-lg whitespace-nowrap z-10"
                  style={{
                    backgroundColor: isSelected 
                      ? colorManager.adjustOpacity(styles.borderColor, 1.0)
                      : colorManager.adjustOpacity(styles.borderColor, 0.95),
                    border: `1px solid ${styles.borderColor}`,
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                    opacity: styles.opacity,
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {detection.class_name} {(detection.confidence * 100).toFixed(0)}%
                </div>
              </div>
            );
          })}
        </>
      )}
      
      {/* Drawing overlay */}
      {isDrawing && drawStart && drawEnd && imageRef.current && (
        <div
          className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none z-20"
          style={{
            left: `${Math.min(drawStart.x, drawEnd.x) * scaleX}px`,
            top: `${Math.min(drawStart.y, drawEnd.y) * scaleY}px`,
            width: `${Math.abs(drawEnd.x - drawStart.x) * scaleX}px`,
            height: `${Math.abs(drawEnd.y - drawStart.y) * scaleY}px`,
          }}
        />
      )}
    </div>
  );
}
