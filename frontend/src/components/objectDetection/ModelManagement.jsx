import { Download, Trash, Upload as UploadIcon } from 'lucide-react';

/**
 * Model Management Component
 * Handles model upload, download, and deletion
 */
export default function ModelManagement({
  models,
  modelUploadFile,
  modelUploadName,
  uploadingModel,
  onModelUploadFileChange,
  onModelUploadNameChange,
  onModelUpload,
  onModelDownload,
  onModelDelete
}) {
  return (
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
                onModelUploadFileChange(file);
                if (!modelUploadName) {
                  onModelUploadNameChange(file.name.replace('.pt', ''));
                }
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="text"
            placeholder="Model name (optional)"
            value={modelUploadName}
            onChange={(e) => onModelUploadNameChange(e.target.value)}
            className="w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            onClick={onModelUpload}
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
                  <>
                    <button
                      onClick={() => onModelDownload(model.name)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      title="Download model"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onModelDelete(model.name)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Delete model"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </>
                )}
                {model.type === 'default' && (
                  <button
                    onClick={() => onModelDownload(model.name)}
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
  );
}
