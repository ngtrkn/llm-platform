import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Settings, Download, Edit, Trash2, Plus, X, Save, Upload as UploadIcon, Trash } from 'lucide-react';
import { detectObjects, listModels, checkCVServiceHealth, uploadModel, downloadModel, deleteModel, getModelStatus } from '../services/cvApi';

function ObjectDetection() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [detections, setDetections] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('yolo11n.pt');
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [models, setModels] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showModelManagement, setShowModelManagement] = useState(false);
  const [modelUploadFile, setModelUploadFile] = useState(null);
  const [modelUploadName, setModelUploadName] = useState('');
  const [uploadingModel, setUploadingModel] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showSegmentation, setShowSegmentation] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState('both'); // 'boxes', 'segmentation', 'both'
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', lastCheck: null });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [editableDetections, setEditableDetections] = useState([]);
  const [editingDetection, setEditingDetection] = useState(null);
  const [selectedDetectionId, setSelectedDetectionId] = useState(null);
  const [isCreatingDetection, setIsCreatingDetection] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [drawEnd, setDrawEnd] = useState(null);
  const [nextDetectionId, setNextDetectionId] = useState(1000); // Start from high number to avoid conflicts
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const canvasRef = useRef(null);

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

  // Sync editable detections when detections change
  useEffect(() => {
    if (detections && detections.detections) {
      // Ensure segmentation data is properly structured
      const processedDetections = detections.detections.map(d => ({
        ...d,
        segmentation: d.segmentation || {
          polygon: [],
          mask_available: false
        }
      }));
      setEditableDetections(processedDetections);
      // Find the highest ID to set nextDetectionId
      const maxId = Math.max(...detections.detections.map(d => d.id || 0), 0);
      setNextDetectionId(Math.max(maxId + 1, 1000));
    } else {
      setEditableDetections([]);
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

  const handleModelUpload = async () => {
    if (!modelUploadFile) {
      alert('Please select a model file');
      return;
    }

    setUploadingModel(true);
    try {
      await uploadModel(modelUploadFile, modelUploadName || null);
      alert('Model uploaded successfully!');
      setModelUploadFile(null);
      setModelUploadName('');
      await loadModels(); // Reload model list
    } catch (error) {
      console.error('Model upload error:', error);
      alert(`Failed to upload model: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploadingModel(false);
    }
  };

  const handleModelDownload = async (modelName) => {
    try {
      await downloadModel(modelName);
    } catch (error) {
      console.error('Model download error:', error);
      alert(`Failed to download model: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleModelDelete = async (modelName) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) {
      return;
    }

    try {
      await deleteModel(modelName);
      alert('Model deleted successfully!');
      await loadModels(); // Reload model list
    } catch (error) {
      console.error('Model delete error:', error);
      alert(`Failed to delete model: ${error.response?.data?.detail || error.message}`);
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
    setEditableDetections([]);
    setEditingDetection(null);
    setSelectedDetectionId(null);
    setIsCreatingDetection(false);
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle detection selection
  const handleSelectDetection = (detectionId) => {
    setSelectedDetectionId(prev => prev === detectionId ? null : detectionId);
  };

  // Handle detection edit
  const handleEditDetection = (detection) => {
    setEditingDetection({ ...detection });
    setSelectedDetectionId(detection.id);
  };

  // Handle detection delete
  const handleDeleteDetection = (detectionId) => {
    setEditableDetections(prev => prev.filter(d => d.id !== detectionId));
    if (editingDetection && editingDetection.id === detectionId) {
      setEditingDetection(null);
    }
  };

  // Handle save edited detection
  const handleSaveDetection = () => {
    if (!editingDetection) return;

    setEditableDetections(prev => 
      prev.map(d => d.id === editingDetection.id ? editingDetection : d)
    );
    setEditingDetection(null);
    // Keep selection after saving
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingDetection(null);
    setIsCreatingDetection(false);
    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
  };

  // Handle create new detection
  const handleCreateDetection = () => {
    setIsCreatingDetection(true);
    setIsDrawing(true);
  };

  // Handle mouse down for drawing bounding box
  const handleMouseDown = (e) => {
    if (!isCreatingDetection || !imageRef.current) return;
    
    // Start drawing
    setIsDrawing(true);

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const scaleX = imageRef.current.naturalWidth / imageRef.current.offsetWidth;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.offsetHeight;
    
    const imgX = x * scaleX;
    const imgY = y * scaleY;

    setDrawStart({ x: imgX, y: imgY });
    setDrawEnd({ x: imgX, y: imgY });
  };

  // Handle mouse move for drawing bounding box
  const handleMouseMove = (e) => {
    if (!isDrawing || !drawStart || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const scaleX = imageRef.current.naturalWidth / imageRef.current.offsetWidth;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.offsetHeight;
    
    const imgX = x * scaleX;
    const imgY = y * scaleY;

    setDrawEnd({ x: imgX, y: imgY });
  };

  // Handle mouse up to finish drawing
  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawEnd) return;

    const x1 = Math.min(drawStart.x, drawEnd.x);
    const y1 = Math.min(drawStart.y, drawEnd.y);
    const x2 = Math.max(drawStart.x, drawEnd.x);
    const y2 = Math.max(drawStart.y, drawEnd.y);

    // Only create if box is large enough
    if (Math.abs(x2 - x1) > 10 && Math.abs(y2 - y1) > 10) {
      const newDetection = {
        id: nextDetectionId,
        class_id: 0,
        class_name: 'object',
        confidence: 0.5,
        bbox: {
          x1: x1,
          y1: y1,
          x2: x2,
          y2: y2,
          width: x2 - x1,
          height: y2 - y1
        }
      };
      setEditableDetections(prev => [...prev, newDetection]);
      setNextDetectionId(prev => prev + 1);
      setEditingDetection(newDetection);
      setSelectedDetectionId(newDetection.id); // Auto-select newly created detection
    }

    setIsDrawing(false);
    setIsCreatingDetection(false);
    setDrawStart(null);
    setDrawEnd(null);
  };

  // Convert detections to YOLO text format
  const convertToYOLOFormat = () => {
    if (!editableDetections || editableDetections.length === 0) {
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

    const yoloLines = editableDetections.map((detection, index) => {
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
      if (!editableDetections || editableDetections.length === 0) {
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
            <div className="flex space-x-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {models.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({model.type})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowModelManagement(!showModelManagement)}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Manage Models
              </button>
            </div>
          </div>
          {showModelManagement && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 space-y-4">
              <h4 className="font-semibold text-gray-800">Model Management</h4>
              
              {/* Upload Model */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Upload Custom Model
                </label>
                <div className="flex space-x-2">
                  <input
                    type="file"
                    accept=".pt"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setModelUploadFile(file);
                        if (!modelUploadName) {
                          setModelUploadName(file.name.replace('.pt', ''));
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Model name (optional)"
                    value={modelUploadName}
                    onChange={(e) => setModelUploadName(e.target.value)}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleModelUpload}
                    disabled={!modelUploadFile || uploadingModel}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {uploadingModel ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <UploadIcon className="w-4 h-4" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Model List with Actions */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Available Models
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {models.map((model) => (
                    <div
                      key={model.name}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-800">{model.name}</span>
                        <span className="text-xs text-gray-500 ml-2">({model.type})</span>
                      </div>
                      <div className="flex space-x-2">
                        {model.type === 'custom' && (
                          <button
                            onClick={() => handleModelDownload(model.name)}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Download model"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {model.type === 'custom' && (
                          <button
                            onClick={() => handleModelDelete(model.name)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Delete model"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                        {model.type === 'default' && (
                          <button
                            onClick={() => handleModelDownload(model.name)}
                            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="Download model (will be auto-downloaded on first use)"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{ cursor: isCreatingDetection ? 'crosshair' : 'default' }}
                  />
                  {editableDetections && editableDetections.length > 0 && imageRef.current && imageRef.current.offsetWidth > 0 && (
                    <div 
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{
                        width: `${imageRef.current.offsetWidth}px`,
                        height: `${imageRef.current.offsetHeight}px`
                      }}
                    >
                      {/* SVG for segmentation polygons */}
                      {showSegmentation && (
                        <svg
                          className="absolute top-0 left-0"
                          style={{
                            width: `${imageRef.current.offsetWidth}px`,
                            height: `${imageRef.current.offsetHeight}px`
                          }}
                        >
                          {editableDetections.map((detection, idx) => {
                            const img = imageRef.current;
                            if (!img || !img.naturalWidth || !img.naturalHeight) return null;
                            
                            // Check if segmentation is available
                            const hasSegmentation = detection.segmentation && 
                              detection.segmentation.mask_available && 
                              detection.segmentation.polygon && 
                              detection.segmentation.polygon.length > 0;
                            
                            if (!hasSegmentation) return null;
                            
                            // Get actual image dimensions
                            const imgNaturalWidth = img.naturalWidth;
                            const imgNaturalHeight = img.naturalHeight;
                            const displayWidth = img.offsetWidth;
                            const displayHeight = img.offsetHeight;
                            
                            // Calculate scale factors
                            const scaleX = displayWidth / imgNaturalWidth;
                            const scaleY = displayHeight / imgNaturalHeight;
                            
                            // Scale polygon points
                            const polygonPoints = detection.segmentation.polygon
                              .map(point => `${point[0] * scaleX},${point[1] * scaleY}`)
                              .join(' ');
                            
                            // Check if this detection is selected
                            const isSelected = selectedDetectionId === detection.id;
                            const isDimmed = selectedDetectionId !== null && !isSelected;
                            
                            const borderColor = isSelected 
                              ? getBorderColor(detection.class_id).replace('0.8', '1') 
                              : getBorderColor(detection.class_id);
                            const fillColor = isSelected
                              ? getClassColor(detection.class_id).replace('0.5', '0.6')
                              : getClassColor(detection.class_id);
                            const opacity = isDimmed ? 0.3 : (isSelected ? 0.7 : 0.5);
                            const strokeWidth = isSelected ? 3 : 2;
                            
                            return (
                              <polygon
                                key={`seg-${detection.id || idx}`}
                                points={polygonPoints}
                                fill={fillColor}
                                stroke={borderColor}
                                strokeWidth={strokeWidth}
                                opacity={opacity}
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
                          {editableDetections.map((detection, idx) => {
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
                            
                            // Check if this detection is selected
                            const isSelected = selectedDetectionId === detection.id;
                            const isDimmed = selectedDetectionId !== null && !isSelected;
                            
                            // Enhanced styles for selected detection
                            const borderWidth = isSelected ? '4px' : '2px';
                            const borderColor = isSelected 
                              ? getBorderColor(detection.class_id).replace('0.8', '1') 
                              : getBorderColor(detection.class_id);
                            const backgroundColor = isSelected
                              ? getClassColor(detection.class_id).replace('0.5', '0.7')
                              : getClassColor(detection.class_id);
                            const opacity = isDimmed ? 0.3 : 1;
                            const boxShadow = isSelected
                              ? `0 0 0 2px ${borderColor}, 0 0 15px rgba(0,0,0,0.5)`
                              : `0 0 0 1px ${borderColor}`;
                            
                            return (
                              <div
                                key={detection.id || idx}
                                className="absolute"
                                style={{
                                  left: `${x1}px`,
                                  top: `${y1}px`,
                                  width: `${width}px`,
                                  height: `${height}px`,
                                  border: `${borderWidth} solid ${borderColor}`,
                                  backgroundColor: backgroundColor,
                                  borderRadius: '4px',
                                  boxShadow: boxShadow,
                                  transition: 'all 0.3s ease',
                                  opacity: opacity,
                                  zIndex: isSelected ? 30 : 10,
                                }}
                              >
                                <div
                                  className="absolute -top-7 left-0 px-2 py-1 text-xs font-semibold text-white rounded shadow-lg whitespace-nowrap z-10"
                                  style={{
                                    backgroundColor: isSelected 
                                      ? getBorderColor(detection.class_id).replace('0.8', '1')
                                      : getBorderColor(detection.class_id).replace('0.8', '0.95'),
                                    border: `1px solid ${borderColor}`,
                                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                    opacity: opacity,
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
                    </div>
                  )}
                  {editableDetections && editableDetections.length > 0 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {editableDetections.length} objects detected
                    </div>
                  )}
                  {/* Drawing overlay for creating new bounding boxes */}
                  {isDrawing && drawStart && drawEnd && imageRef.current && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none z-20"
                      style={{
                        left: `${Math.min(drawStart.x, drawEnd.x) * (imageRef.current.offsetWidth / imageRef.current.naturalWidth)}px`,
                        top: `${Math.min(drawStart.y, drawEnd.y) * (imageRef.current.offsetHeight / imageRef.current.naturalHeight)}px`,
                        width: `${Math.abs(drawEnd.x - drawStart.x) * (imageRef.current.offsetWidth / imageRef.current.naturalWidth)}px`,
                        height: `${Math.abs(drawEnd.y - drawStart.y) * (imageRef.current.offsetHeight / imageRef.current.naturalHeight)}px`,
                      }}
                    />
                  )}
                  {isCreatingDetection && !isDrawing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 pointer-events-none z-10">
                      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
                        Click and drag on the image to draw a bounding box
                      </div>
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
                {editableDetections && editableDetections.length > 0 && (
                  <>
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
                    {editableDetections.some(d => d.segmentation?.mask_available) && (
                      <button
                        onClick={() => setShowSegmentation(!showSegmentation)}
                        className={`px-4 py-2 rounded-lg text-sm ${
                          showSegmentation 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                        }`}
                      >
                        {showSegmentation ? 'Hide Masks' : 'Show Masks'}
                      </button>
                    )}
                  </>
                )}
                {previewUrl && (
                  <button
                    onClick={handleCreateDetection}
                    disabled={isDrawing || isCreatingDetection}
                    className={`px-4 py-2 text-white rounded-lg flex items-center space-x-2 transition-colors ${
                      isCreatingDetection 
                        ? 'bg-purple-600 cursor-wait' 
                        : 'bg-purple-500 hover:bg-purple-600'
                    } ${isDrawing ? 'opacity-50' : ''}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingDetection ? 'Click on image to draw...' : 'Add Detection'}</span>
                  </button>
                )}
                {isCreatingDetection && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
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

        {editableDetections && editableDetections.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Detection Results</h3>
            <div className="space-y-2">
              {editableDetections.map((detection) => {
                const isSelected = selectedDetectionId === detection.id;
                const isEditing = editingDetection && editingDetection.id === detection.id;
                
                return (
                  <div
                    key={detection.id}
                    onClick={() => handleSelectDetection(detection.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 border-2 shadow-md'
                        : isEditing
                        ? 'bg-blue-50 border-blue-500 border-2'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className={`font-medium ${
                          isSelected ? 'text-blue-800' : 'text-gray-800'
                        }`}>
                          {detection.class_name}
                        </span>
                        <span className={`text-sm ml-2 ${
                          isSelected ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          (ID: {detection.class_id})
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm">
                          <span className={`font-medium ${
                            isSelected ? 'text-blue-700' : 'text-blue-600'
                          }`}>
                            {(detection.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditDetection(detection)}
                            className={`p-1.5 rounded transition-colors ${
                              isSelected
                                ? 'text-blue-700 hover:bg-blue-200'
                                : 'text-blue-600 hover:bg-blue-100'
                            }`}
                            title="Edit detection"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDetection(detection.id)}
                            className={`p-1.5 rounded transition-colors ${
                              isSelected
                                ? 'text-red-700 hover:bg-red-200'
                                : 'text-red-600 hover:bg-red-100'
                            }`}
                            title="Delete detection"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className={`text-xs mt-1 ${
                      isSelected ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      BBox: ({detection.bbox.x1.toFixed(0)}, {detection.bbox.y1.toFixed(0)}) - ({detection.bbox.x2.toFixed(0)}, {detection.bbox.y2.toFixed(0)})
                    </div>
                  </div>
                );
              })}
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
              {editableDetections && editableDetections.length > 0 && (
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

        {detections && detections.detections && detections.detections.length === 0 && editableDetections.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No objects detected in the image.</p>
          </div>
        )}

        {/* Edit Detection Modal */}
        {editingDetection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Edit Detection</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class Name
                  </label>
                  <input
                    type="text"
                    value={editingDetection.class_name}
                    onChange={(e) => setEditingDetection({ ...editingDetection, class_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter class name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class ID
                  </label>
                  <input
                    type="number"
                    value={editingDetection.class_id}
                    onChange={(e) => setEditingDetection({ ...editingDetection, class_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence: {(editingDetection.confidence * 100).toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={editingDetection.confidence}
                    onChange={(e) => setEditingDetection({ ...editingDetection, confidence: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      X1
                    </label>
                    <input
                      type="number"
                      value={editingDetection.bbox.x1.toFixed(0)}
                      onChange={(e) => {
                        const x1 = Math.max(0, Math.min(parseFloat(e.target.value) || 0, imageRef.current?.naturalWidth || 9999));
                        const x2 = Math.max(x1, editingDetection.bbox.x2);
                        setEditingDetection({
                          ...editingDetection,
                          bbox: {
                            ...editingDetection.bbox,
                            x1: x1,
                            x2: x2,
                            width: x2 - x1
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max={imageRef.current?.naturalWidth || 9999}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Y1
                    </label>
                    <input
                      type="number"
                      value={editingDetection.bbox.y1.toFixed(0)}
                      onChange={(e) => {
                        const y1 = Math.max(0, Math.min(parseFloat(e.target.value) || 0, imageRef.current?.naturalHeight || 9999));
                        const y2 = Math.max(y1, editingDetection.bbox.y2);
                        setEditingDetection({
                          ...editingDetection,
                          bbox: {
                            ...editingDetection.bbox,
                            y1: y1,
                            y2: y2,
                            height: y2 - y1
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      max={imageRef.current?.naturalHeight || 9999}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      X2
                    </label>
                    <input
                      type="number"
                      value={editingDetection.bbox.x2.toFixed(0)}
                      onChange={(e) => {
                        const x2 = Math.max(editingDetection.bbox.x1, Math.min(parseFloat(e.target.value) || 0, imageRef.current?.naturalWidth || 9999));
                        setEditingDetection({
                          ...editingDetection,
                          bbox: {
                            ...editingDetection.bbox,
                            x2: x2,
                            width: x2 - editingDetection.bbox.x1
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={editingDetection.bbox.x1}
                      max={imageRef.current?.naturalWidth || 9999}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Y2
                    </label>
                    <input
                      type="number"
                      value={editingDetection.bbox.y2.toFixed(0)}
                      onChange={(e) => {
                        const y2 = Math.max(editingDetection.bbox.y1, Math.min(parseFloat(e.target.value) || 0, imageRef.current?.naturalHeight || 9999));
                        setEditingDetection({
                          ...editingDetection,
                          bbox: {
                            ...editingDetection.bbox,
                            y2: y2,
                            height: y2 - editingDetection.bbox.y1
                          }
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min={editingDetection.bbox.y1}
                      max={imageRef.current?.naturalHeight || 9999}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDetection}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ObjectDetection;
