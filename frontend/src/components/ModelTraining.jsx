import { useState, useEffect, useRef } from 'react';
import { Upload, Play, FolderOpen, List, Loader } from 'lucide-react';
import { trainModel, listTrainingProjects, trainFromFolder, checkCVServiceHealth } from '../services/cvApi';

function ModelTraining() {
  const [trainingConfig, setTrainingConfig] = useState({
    base_model: 'yolov8n.pt',
    epochs: 100,
    batch_size: 16,
    img_size: 640,
    device: 'cpu',
    project_name: ''
  });
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [datasetPath, setDatasetPath] = useState('');
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [useFolder, setUseFolder] = useState(false);
  const [healthStatus, setHealthStatus] = useState({ status: 'checking', lastCheck: null });
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadProjects();
    checkHealth();
    
    // Set up health check polling every 1 second
    const healthInterval = setInterval(() => {
      checkHealth();
    }, 1000);
    
    return () => clearInterval(healthInterval);
  }, []);

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

  const loadProjects = async () => {
    try {
      const data = await listTrainingProjects();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleDatasetSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedDataset(file);
    }
  };

  const handleTrain = async () => {
    if (!useFolder && !selectedDataset) {
      alert('Please select a dataset file or provide a folder path');
      return;
    }

    setLoading(true);
    setTrainingStatus(null);

    try {
      let result;
      if (useFolder) {
        if (!datasetPath) {
          alert('Please provide a dataset folder path');
          return;
        }
        result = await trainFromFolder(
          datasetPath,
          trainingConfig.base_model,
          trainingConfig.epochs,
          trainingConfig.batch_size,
          trainingConfig.img_size,
          trainingConfig.device,
          trainingConfig.project_name || undefined
        );
      } else {
        const formData = new FormData();
        formData.append('dataset', selectedDataset);
        formData.append('base_model', trainingConfig.base_model);
        formData.append('epochs', trainingConfig.epochs.toString());
        formData.append('batch_size', trainingConfig.batch_size.toString());
        formData.append('img_size', trainingConfig.img_size.toString());
        formData.append('device', trainingConfig.device);
        if (trainingConfig.project_name) {
          formData.append('project_name', trainingConfig.project_name);
        }

        result = await trainModel(formData);
      }

      setTrainingStatus(result);
      if (result.status === 'completed') {
        loadProjects();
      }
    } catch (error) {
      console.error('Training error:', error);
      setTrainingStatus({
        status: 'failed',
        error: error.response?.data?.detail || error.message
      });
    } finally {
      setLoading(false);
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
          <Play className="w-6 h-6" />
          <span>Model Training</span>
        </h2>
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
      </div>

      <div className="space-y-6">
        {/* Training Mode Selection */}
        <div className="flex space-x-4">
          <button
            onClick={() => setUseFolder(false)}
            className={`px-4 py-2 rounded-lg ${
              !useFolder
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Upload Dataset (ZIP)
          </button>
          <button
            onClick={() => setUseFolder(true)}
            className={`px-4 py-2 rounded-lg ${
              useFolder
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FolderOpen className="w-4 h-4 inline mr-2" />
            Use Existing Folder
          </button>
        </div>

        {/* Dataset Input */}
        {!useFolder ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleDatasetSelect}
              className="hidden"
              id="dataset-upload"
            />
            <label
              htmlFor="dataset-upload"
              className="cursor-pointer"
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                {selectedDataset ? selectedDataset.name : 'Upload Dataset ZIP File'}
              </p>
              <p className="text-sm text-gray-500">
                Dataset should follow YOLO format: images/train, images/val, labels/train, labels/val
              </p>
            </label>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Folder Path
            </label>
            <input
              type="text"
              value={datasetPath}
              onChange={(e) => setDatasetPath(e.target.value)}
              placeholder="/path/to/dataset"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Training Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Model
            </label>
            <select
              value={trainingConfig.base_model}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, base_model: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="yolov8n.pt">YOLOv8 Nano</option>
              <option value="yolov8s.pt">YOLOv8 Small</option>
              <option value="yolov8m.pt">YOLOv8 Medium</option>
              <option value="yolov8l.pt">YOLOv8 Large</option>
              <option value="yolov8x.pt">YOLOv8 XLarge</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Device
            </label>
            <select
              value={trainingConfig.device}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, device: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="cpu">CPU</option>
              <option value="cuda">CUDA (GPU)</option>
              <option value="mps">MPS (Apple Silicon)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Epochs
            </label>
            <input
              type="number"
              value={trainingConfig.epochs}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, epochs: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Batch Size
            </label>
            <input
              type="number"
              value={trainingConfig.batch_size}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, batch_size: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Size
            </label>
            <input
              type="number"
              value={trainingConfig.img_size}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, img_size: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="320"
              step="32"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name (optional)
            </label>
            <input
              type="text"
              value={trainingConfig.project_name}
              onChange={(e) => setTrainingConfig({ ...trainingConfig, project_name: e.target.value })}
              placeholder="Auto-generated if empty"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Train Button */}
        <button
          onClick={handleTrain}
          disabled={loading || (!useFolder && !selectedDataset) || (useFolder && !datasetPath)}
          className="w-full px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              <span>Training...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>Start Training</span>
            </>
          )}
        </button>

        {/* Training Status */}
        {trainingStatus && (
          <div className={`p-4 rounded-lg ${
            trainingStatus.status === 'completed' ? 'bg-green-50 border border-green-200' :
            trainingStatus.status === 'failed' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <h3 className="font-semibold mb-2">
              {trainingStatus.status === 'completed' ? 'Training Completed!' :
               trainingStatus.status === 'failed' ? 'Training Failed' :
               'Training Status'}
            </h3>
            {trainingStatus.status === 'completed' && (
              <div className="space-y-2 text-sm">
                <p><strong>Project:</strong> {trainingStatus.project_name}</p>
                {trainingStatus.best_model && (
                  <p><strong>Best Model:</strong> {trainingStatus.best_model}</p>
                )}
                {trainingStatus.results?.metrics && (
                  <div>
                    <p><strong>mAP50:</strong> {trainingStatus.results.metrics.mAP50?.toFixed(4)}</p>
                    <p><strong>mAP50-95:</strong> {trainingStatus.results.metrics['mAP50-95']?.toFixed(4)}</p>
                  </div>
                )}
              </div>
            )}
            {trainingStatus.status === 'failed' && (
              <p className="text-red-800">{trainingStatus.error}</p>
            )}
          </div>
        )}

        {/* Training Projects List */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
            <List className="w-5 h-5" />
            <span>Training Projects</span>
          </h3>
          {projects.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No training projects yet</p>
          ) : (
            <div className="space-y-2">
              {projects.map((project, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{project.project_name}</p>
                      {project.num_classes && (
                        <p className="text-sm text-gray-600">
                          {project.num_classes} classes, {project.epochs} epochs
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                  {project.best_model && (
                    <p className="text-xs text-gray-500 mt-2">
                      Best model: {project.best_model}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModelTraining;
