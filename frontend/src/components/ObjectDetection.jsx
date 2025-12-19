import { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Settings, Download, Plus, X } from 'lucide-react';
import { detectObjects, listModels, checkCVServiceHealth, uploadModel, downloadModel, deleteModel } from '../services/cvApi';
import { useDetections } from '../hooks/useDetections';
import { useImageHandling } from '../hooks/useImageHandling';
import { yoloConfig } from '../config/yoloConfig';
import ColorManager from '../utils/colorManager';
import YOLOFormatter from '../utils/yoloFormatter';
import DetectionManager from '../utils/detectionManager';
import DetectionVisualization from './objectDetection/DetectionVisualization';
import DetectionList from './objectDetection/DetectionList';
import DetectionEditor from './objectDetection/DetectionEditor';
import SettingsPanel from './objectDetection/SettingsPanel';
import HealthStatus from './objectDetection/HealthStatus';

function ObjectDetection() {
  // Configuration
  const [colorManager, setColorManager] = useState(null);
  
  // Settings
  const [selectedModel, setSelectedModel] = useState('yolo11n.pt');
  const [confidence, setConfidence] = useState(0.25);
  const [iou, setIou] = useState(0.45);
  const [models, setModels] = useState([]);
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showModelManagement, setShowModelManagement] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [showSegmentation, setShowSegmentation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', lastCheck: null });
  
  // Model upload
  const [modelUploadFile, setModelUploadFile] = useState(null);
  const [modelUploadName, setModelUploadName] = useState('');
  const [uploadingModel, setUploadingModel] = useState(false);
  
  // Detection state
  const [detections, setDetections] = useState(null);
  const {
    detections: editableDetections,
    selectedDetectionId,
    editingDetection,
    updateDetections,
    selectDetection,
    startEdit,
    cancelEdit,
    saveEdit,
    deleteDetection,
    createDetection,
    clearDetections
  } = useDetections([], 1000);
  
  // Image handling
  const {
    selectedImage,
    previewUrl,
    imageRef,
    fileInputRef,
    handleImageSelect,
    handleImageLoad,
    resetImage
  } = useImageHandling();
  
  // Drawing state (consolidated)
  const [drawing, setDrawing] = useState({ isActive: false, isCreating: false, start: null, end: null });
  const detectionManager = useRef(new DetectionManager(1000));

  // Load configuration
  useEffect(() => {
    const init = async () => {
      try {
        const [colorConfig, defaultConfidence, defaultIoU, defaultModel, vizSettings] = await Promise.all([
          yoloConfig.getColorConfig(),
          yoloConfig.getDefaultConfidence(),
          yoloConfig.getDefaultIoU(),
          yoloConfig.getDefaultModel(),
          yoloConfig.getVisualizationSettings()
        ]);
        
        setColorManager(new ColorManager(colorConfig));
        setConfidence(defaultConfidence);
        setIou(defaultIoU);
        setSelectedModel(defaultModel);
        setShowBoundingBoxes(vizSettings.show_boxes_by_default ?? true);
        setShowSegmentation(vizSettings.show_segmentation_by_default ?? true);
      } catch (error) {
        console.error('Error loading config:', error);
        setColorManager(new ColorManager());
      }
    };
    
    init();
    loadModels();
    checkHealth();
  }, []);

  // Health check polling
  useEffect(() => {
    const interval = setInterval(checkHealth, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync detections
  useEffect(() => {
    if (detections?.detections) {
      updateDetections(detections);
    }
  }, [detections, updateDetections]);

  const getBaseUrl = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return apiBaseUrl.replace('/api/v1', '').replace('/api', '') || 'http://localhost:8000';
  };

  const checkHealth = async () => {
    try {
      const health = await checkCVServiceHealth();
      setHealthStatus({
        status: health.status || 'unhealthy',
        lastCheck: new Date(),
        error: health.error
      });
    } catch (error) {
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
      await loadModels();
    } catch (error) {
      alert(`Failed to upload model: ${error.response?.data?.detail || error.message}`);
    } finally {
      setUploadingModel(false);
    }
  };

  const handleModelDownload = async (modelName) => {
    try {
      await downloadModel(modelName);
    } catch (error) {
      alert(`Failed to download model: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleModelDelete = async (modelName) => {
    if (!confirm(`Are you sure you want to delete ${modelName}?`)) return;
    try {
      await deleteModel(modelName);
      alert('Model deleted successfully!');
      await loadModels();
    } catch (error) {
      alert(`Failed to delete model: ${error.response?.data?.detail || error.message}`);
    }
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
      const errorMessage = error.code === 'ERR_NETWORK' || error.message.includes('Network Error')
        ? 'Cannot connect to CV service. Please ensure the CV service is running.'
        : error.response?.data?.detail || error.response?.statusText || error.message || 'Unknown error';
      alert(`Detection failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    resetImage();
    setDetections(null);
    clearDetections();
    setDrawing({ isActive: false, isCreating: false, start: null, end: null });
  };

  // Drawing handlers (simplified)
  const getImageCoords = (e) => {
    if (!imageRef.current) return null;
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / imageRef.current.offsetWidth;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.offsetHeight;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e) => {
    if (!drawing.isCreating || !imageRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const coords = getImageCoords(e);
    if (coords) {
      setDrawing({ ...drawing, isActive: true, start: coords, end: coords });
    }
  };

  const handleMouseMove = (e) => {
    if (!drawing.isActive || !drawing.start) return;
    e.preventDefault();
    e.stopPropagation();
    const coords = getImageCoords(e);
    if (coords) {
      setDrawing({ ...drawing, end: coords });
    }
  };

  const handleMouseUp = (e) => {
    if (!drawing.isActive || !drawing.start || !drawing.end) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const bbox = detectionManager.current.calculateBboxFromDrawing(
      drawing.start,
      drawing.end,
      imageRef
    );

    if (bbox) {
      createDetection(bbox, 0, 'object', 0.5, false);
    }

    setDrawing({ isActive: false, isCreating: false, start: null, end: null });
  };

  const handleCreateDetection = () => {
    setDrawing({ isActive: false, isCreating: true, start: null, end: null });
  };

  const handleCancelDrawing = () => {
    setDrawing({ isActive: false, isCreating: false, start: null, end: null });
  };

  const handleDownloadYOLO = () => {
    try {
      if (!editableDetections?.length) {
        alert('No detections available to download');
        return;
      }
      if (!imageRef.current?.naturalWidth || !imageRef.current?.naturalHeight) {
        alert('Image dimensions not available. Please wait for the image to load completely.');
        return;
      }
      const filename = selectedImage?.name || 'annotation';
      YOLOFormatter.downloadYOLOAnnotation(
        editableDetections,
        imageRef.current.naturalWidth,
        imageRef.current.naturalHeight,
        filename
      );
    } catch (error) {
      alert(`Failed to download YOLO annotation: ${error.message}`);
    }
  };

  if (!colorManager) {
    return <div className="p-6 text-center">Loading configuration...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center space-x-2">
          <ImageIcon className="w-6 h-6" />
          <span>Object Detection</span>
        </h2>
        <div className="flex items-center space-x-3">
          <HealthStatus healthStatus={healthStatus} />
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SettingsPanel
        showSettings={showSettings}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        confidence={confidence}
        onConfidenceChange={setConfidence}
        iou={iou}
        onIoUChange={setIou}
        showModelManagement={showModelManagement}
        onToggleModelManagement={() => setShowModelManagement(!showModelManagement)}
        modelUploadFile={modelUploadFile}
        modelUploadName={modelUploadName}
        uploadingModel={uploadingModel}
        onModelUploadFileChange={setModelUploadFile}
        onModelUploadNameChange={setModelUploadName}
        onModelUpload={handleModelUpload}
        onModelDownload={handleModelDownload}
        onModelDelete={handleModelDelete}
      />

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          {previewUrl ? (
            <div className="space-y-4">
              <div className="relative inline-block max-w-full">
                <div 
                  className="relative inline-block" 
                  style={{ 
                    userSelect: drawing.isCreating ? 'none' : 'auto',
                    WebkitUserSelect: drawing.isCreating ? 'none' : 'auto'
                  }}
                >
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-96 rounded-lg block"
                    draggable={false}
                    onLoad={handleImageLoad}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onDragStart={(e) => e.preventDefault()}
                    style={{ 
                      cursor: drawing.isCreating ? 'crosshair' : 'default',
                      userSelect: 'none',
                      WebkitUserSelect: 'none'
                    }}
                  />
                  <DetectionVisualization
                    imageRef={imageRef}
                    detections={editableDetections}
                    showBoundingBoxes={showBoundingBoxes}
                    showSegmentation={showSegmentation}
                    selectedDetectionId={selectedDetectionId}
                    colorManager={colorManager}
                    isDrawing={drawing.isActive}
                    drawStart={drawing.start}
                    drawEnd={drawing.end}
                    onDetectionClick={(detectionId) => {
                      if (!drawing.isCreating) {
                        const detection = editableDetections.find(d => d.id === detectionId);
                        if (detection) {
                          selectDetection(detectionId);
                          startEdit(detection);
                        }
                      }
                    }}
                    isCreatingDetection={drawing.isCreating}
                  />
                  {editableDetections?.length > 0 && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                      {editableDetections.length} objects detected
                    </div>
                  )}
                  {drawing.isCreating && !drawing.isActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 pointer-events-none z-10">
                      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
                        Click and drag on the image to draw a bounding box
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 justify-center items-center flex-wrap gap-2">
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
                {editableDetections?.length > 0 && (
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
                    disabled={drawing.isActive || drawing.isCreating}
                    className={`px-4 py-2 text-white rounded-lg flex items-center space-x-2 transition-colors ${
                      drawing.isCreating 
                        ? 'bg-purple-600 cursor-wait' 
                        : 'bg-purple-500 hover:bg-purple-600'
                    } ${drawing.isActive ? 'opacity-50' : ''}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{drawing.isCreating ? 'Click on image to draw...' : 'Add Detection'}</span>
                  </button>
                )}
                {drawing.isCreating && (
                  <button
                    onClick={handleCancelDrawing}
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

        <DetectionList
          detections={editableDetections}
          selectedDetectionId={selectedDetectionId}
          editingDetection={editingDetection}
          onSelectDetection={selectDetection}
          onEditDetection={startEdit}
          onDeleteDetection={deleteDetection}
        />

        {editableDetections?.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {detections?.annotated_path && (
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
            <button
              onClick={handleDownloadYOLO}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download YOLO Annotation (.txt)</span>
            </button>
          </div>
        )}

        {detections?.detections?.length === 0 && editableDetections.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">No objects detected in the image.</p>
          </div>
        )}

        <DetectionEditor
          editingDetection={editingDetection}
          imageRef={imageRef}
          onSave={saveEdit}
          onCancel={cancelEdit}
        />
      </div>
    </div>
  );
}

export default ObjectDetection;
