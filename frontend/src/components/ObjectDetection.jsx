import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Settings, Download } from 'lucide-react';
import { detectObjects, listModels, checkCVServiceHealth } from '../services/cvApi';

function ObjectDetection() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detections, setDetections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('yolov8n.pt');
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [models, setModels] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', lastCheck: null });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  // Get base URL for static file serving
  const getBaseUrl = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return apiBaseUrl.replace('/api/v1', '').replace('/api', '') || 'http://localhost:8000';
  };

  useEffect(() => {
    loadModels();
    checkHealth();
    
    // Set up health check polling every 1 second
    const healthInterval = setInterval(() => {
      checkHealth();
    }, 1000);
    
    // Handle window resize to recalculate image size
    const handleResize = () => {
      if (imageRef.current) {
        handleImageLoad();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(healthInterval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    // Recalculate image size when detections change
    if (detections && imageRef.current) {
      setTimeout(() => {
        handleImageLoad();
      }, 100);
    }
  }, [detections]);

  const checkHealth = async () => {
    try {
      const health = await checkCVServiceHealth();
      setHealthStatus({
        status: health.status || 'unhealthy',
        lastCheck: new Date(),
        error: health.error,
        cvServiceStatus: health.cv_service?.status
      });
    } catch (error) {
      console.error('Health check error:', error);
      setHealthStatus({
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message || 'Health check failed'
      });
    }
  };

  const loadModels = async () => {
    try {
      const data = await listModels();
      setModels(data.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setDetections(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      // Use a small delay to ensure image is fully rendered
      setTimeout(() => {
        if (imageRef.current) {
          setImageSize({
            width: imageRef.current.offsetWidth,
            height: imageRef.current.offsetHeight
          });
        }
      }, 50);
    }
  };

  // Generate color for each class
  const getClassColor = (classId) => {
    const colors = [
      'rgba(255, 0, 0, 0.5)',    // Red
      'rgba(0, 255, 0, 0.5)',    // Green
      'rgba(0, 0, 255, 0.5)',    // Blue
      'rgba(255, 255, 0, 0.5)',  // Yellow
      'rgba(255, 0, 255, 0.5)',  // Magenta
      'rgba(0, 255, 255, 0.5)',  // Cyan
      'rgba(255, 165, 0, 0.5)',  // Orange
      'rgba(128, 0, 128, 0.5)',  // Purple
    ];
    return colors[classId % colors.length];
  };

  const getBorderColor = (classId) => {
    const colors = [
      'rgba(255, 0, 0, 0.8)',    // Red
      'rgba(0, 255, 0, 0.8)',    // Green
      'rgba(0, 0, 255, 0.8)',    // Blue
      'rgba(255, 255, 0, 0.8)',  // Yellow
      'rgba(255, 0, 255, 0.8)',  // Magenta
      'rgba(0, 255, 255, 0.8)',  // Cyan
      'rgba(255, 165, 0, 0.8)',  // Orange
      'rgba(128, 0, 128, 0.8)',  // Purple
    ];
    return colors[classId % colors.length];
  };

  const handleDetect = async () => {
    if (!selectedImage) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('model', selectedModel);
      formData.append('confidence', confidence.toString());
      formData.append('iou', iou.toString());
      formData.append('save_result', 'true');

      const result = await detectObjects(formData);
      setDetections(result);
    } catch (error) {
      console.error('Detection error:', error);
      let errorMessage = 'Detection failed: ';
      
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        errorMessage += 'Cannot connect to CV service. Please ensure the CV service is running.';
      } else if (error.response) {
        errorMessage += error.response.data?.detail || error.response.statusText || 'Unknown error';
      } else {
        errorMessage += error.message || 'Unknown error';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setDetections(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert detections to YOLO text format
  const convertToYOLOFormat = () => {
    if (!detections || !detections.detections || detections.detections.length === 0) {
      throw new Error('No detections available');
    }

    if (!imageRef.current || !imageRef.current.naturalWidth || !imageRef.current.naturalHeight) {
      throw new Error('Image dimensions not available');
    }

    const imgWidth = imageRef.current.naturalWidth;
    const imgHeight = imageRef.current.naturalHeight;

    if (imgWidth <= 0 || imgHeight <= 0) {
      throw new Error('Invalid image dimensions');
    }

    const yoloLines = detections.detections.map((detection, index) => {
      const { bbox, class_id } = detection;
      
      // Validate bbox values
      if (typeof bbox.x1 !== 'number' || typeof bbox.x2 !== 'number' || 
          typeof bbox.y1 !== 'number' || typeof bbox.y2 !== 'number' ||
          typeof class_id !== 'number') {
        throw new Error(`Invalid detection data at index ${index}`);
      }

      // Ensure x2 > x1 and y2 > y1
      const x1 = Math.min(bbox.x1, bbox.x2);
      const x2 = Math.max(bbox.x1, bbox.x2);
      const y1 = Math.min(bbox.y1, bbox.y2);
      const y2 = Math.max(bbox.y1, bbox.y2);
      
      // Convert from absolute coordinates (x1, y1, x2, y2) to YOLO format (normalized center_x, center_y, width, height)
      const center_x = ((x1 + x2) / 2) / imgWidth;
      const center_y = ((y1 + y2) / 2) / imgHeight;
      const width = (x2 - x1) / imgWidth;
      const height = (y2 - y1) / imgHeight;

      // Ensure values are within [0, 1] range
      const normalized_center_x = Math.max(0, Math.min(1, center_x));
      const normalized_center_y = Math.max(0, Math.min(1, center_y));
      const normalized_width = Math.max(0, Math.min(1, width));
      const normalized_height = Math.max(0, Math.min(1, height));

      // YOLO format: class_id center_x center_y width height
      return `${class_id} ${normalized_center_x.toFixed(6)} ${normalized_center_y.toFixed(6)} ${normalized_width.toFixed(6)} ${normalized_height.toFixed(6)}`;
    });

    return yoloLines.join('\n');
  };

  // Download YOLO annotation file
  const handleDownloadYOLO = () => {
    try {
      if (!detections || !detections.detections || detections.detections.length === 0) {
        alert('No detections available to download');
        return;
      }

      if (!imageRef.current || !imageRef.current.naturalWidth || !imageRef.current.naturalHeight) {
        alert('Image dimensions not available. Please wait for the image to load completely.');
        return;
      }

      const yoloContent = convertToYOLOFormat();
      
      // Get the original filename without extension
      const originalFileName = selectedImage?.name || 'annotation';
      const fileNameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '');
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
    } catch (error) {
      console.error('Error downloading YOLO annotation:', error);
      alert(`Failed to download YOLO annotation: ${error.message}`);
    }
  };

  const getHealthStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-red-500';
      case 'checking':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getHealthStatusText = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'CV Service Online';
      case 'unhealthy':
        return 'CV Service Offline';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <ImageIcon className="w-6 h-6" />
          <span>Object Detection</span>
        </h2>
        <div className="flex items-center space-x-3">
          {/* Health Status Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <div className={`w-2 h-2 rounded-full ${getHealthStatusColor()} animate-pulse`}></div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700">{getHealthStatusText()}</span>
              {healthStatus.error && healthStatus.status === 'unhealthy' && (
                <span className="text-xs text-red-600" title={healthStatus.error}>
                  {healthStatus.error.length > 50 ? healthStatus.error.substring(0, 50) + '...' : healthStatus.error}
                </span>
              )}
            </div>
            {healthStatus.lastCheck && (
              <span className="text-xs text-gray-500">
                {new Date(healthStatus.lastCheck).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {models.map((model) => (
                <option key={model.name} value={model.name}>
                  {model.name} ({model.type})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence: {confidence.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IoU: {iou.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={iou}
                onChange={(e) => setIou(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative inline-block max-w-full">
                <div className="relative inline-block" style={{ position: 'relative' }}>
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-96 rounded-lg block"
                    onLoad={handleImageLoad}
                  />
                  {detections && detections.detections && showBoundingBoxes && imageRef.current && imageRef.current.offsetWidth > 0 && (
                    <div 
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{
                        width: `${imageRef.current.offsetWidth}px`,
                        height: `${imageRef.current.offsetHeight}px`
                      }}
                    >
                      {detections.detections.map((detection, idx) => {
                        const img = imageRef.current;
                        if (!img || !img.naturalWidth || !img.naturalHeight) return null;
                        
                        // Get actual image dimensions
                        const imgNaturalWidth = img.naturalWidth;
                        const imgNaturalHeight = img.naturalHeight;
                        const displayWidth = img.offsetWidth;
                        const displayHeight = img.offsetHeight;
                        
                        // Calculate scale factors
                        const scaleX = displayWidth / imgNaturalWidth;
                        const scaleY = displayHeight / imgNaturalHeight;
                        
                        // Scale bounding box coordinates
                        const x1 = detection.bbox.x1 * scaleX;
                        const y1 = detection.bbox.y1 * scaleY;
                        const x2 = detection.bbox.x2 * scaleX;
                        const y2 = detection.bbox.y2 * scaleY;
                        const width = x2 - x1;
                        const height = y2 - y1;
                        
                        return (
                          <div
                            key={detection.id || idx}
                            className="absolute"
                            style={{
                              left: `${x1}px`,
                              top: `${y1}px`,
                              width: `${width}px`,
                              height: `${height}px`,
                              border: `2px solid ${getBorderColor(detection.class_id)}`,
                              backgroundColor: getClassColor(detection.class_id),
                              borderRadius: '4px',
                              boxShadow: `0 0 0 1px ${getBorderColor(detection.class_id)}`,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <div
                              className="absolute -top-7 left-0 px-2 py-1 text-xs font-semibold text-white rounded shadow-lg whitespace-nowrap z-10"
                              style={{
                                backgroundColor: getBorderColor(detection.class_id).replace('0.8', '0.95'),
                                border: `1px solid ${getBorderColor(detection.class_id)}`,
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              }}
                            >
                              {detection.class_name} {(detection.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {detections && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {detections.num_detections} objects detected
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 justify-center items-center">
                <button
                  onClick={handleDetect}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Detecting...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      <span>Detect Objects</span>
                    </>
                  )}
                </button>
                {detections && detections.detections && detections.detections.length > 0 && (
                  <button
                    onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      showBoundingBoxes 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                    }`}
                  >
                    {showBoundingBoxes ? 'Hide Boxes' : 'Show Boxes'}
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Reset
                </button>
              </div>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Upload an image to detect objects</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer inline-block"
              >
                Choose Image
              </label>
            </div>
          )}
        </div>

        {detections && detections.detections.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detection Results</h3>
            <div className="space-y-2">
              {detections.detections.map((detection) => (
                <div
                  key={detection.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-800">
                        {detection.class_name}
                      </span>
                      <span className="text-sm text-gray-600 ml-2">
                        (ID: {detection.class_id})
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-blue-600">
                        {(detection.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    BBox: ({detection.bbox.x1.toFixed(0)}, {detection.bbox.y1.toFixed(0)}) - ({detection.bbox.x2.toFixed(0)}, {detection.bbox.y2.toFixed(0)})
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {detections.annotated_path && (
                <a
                  href={`${getBaseUrl()}${detections.annotated_path.replace('uploads/', '/static/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Annotated Image</span>
                </a>
              )}
              {detections && detections.detections && detections.detections.length > 0 && (
                <button
                  onClick={handleDownloadYOLO}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download YOLO Annotation (.txt)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {detections && detections.detections.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No objects detected in the image.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ObjectDetection;
