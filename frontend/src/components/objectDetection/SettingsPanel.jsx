import ModelManagement from './ModelManagement';

/**
 * Settings Panel Component
 * Contains model selection and detection parameters
 */
export default function SettingsPanel({
  showSettings,
  models,
  selectedModel,
  onModelChange,
  confidence,
  onConfidenceChange,
  iou,
  onIoUChange,
  showModelManagement,
  onToggleModelManagement,
  modelUploadFile,
  modelUploadName,
  uploadingModel,
  onModelUploadFileChange,
  onModelUploadNameChange,
  onModelUpload,
  onModelDownload,
  onModelDelete
}) {
  if (!showSettings) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Model
        </label>
        <div className="flex space-x-2">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name} ({model.type})
              </option>
            ))}
          </select>
          <button
            onClick={onToggleModelManagement}
            className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Manage Models
          </button>
        </div>
      </div>
      
      {showModelManagement && (
        <ModelManagement
          models={models}
          modelUploadFile={modelUploadFile}
          modelUploadName={modelUploadName}
          uploadingModel={uploadingModel}
          onModelUploadFileChange={onModelUploadFileChange}
          onModelUploadNameChange={onModelUploadNameChange}
          onModelUpload={onModelUpload}
          onModelDownload={onModelDownload}
          onModelDelete={onModelDelete}
        />
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
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
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
            onChange={(e) => onIoUChange(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
