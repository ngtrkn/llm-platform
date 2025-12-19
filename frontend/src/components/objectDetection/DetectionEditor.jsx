import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

/**
 * Detection Editor Modal Component
 * Allows editing detection properties
 */
export default function DetectionEditor({
  editingDetection,
  imageRef,
  onSave,
  onCancel
}) {
  const [localDetection, setLocalDetection] = useState(editingDetection);

  useEffect(() => {
    setLocalDetection(editingDetection);
  }, [editingDetection]);

  if (!localDetection) {
    return null;
  }

  const handleSave = () => {
    onSave(localDetection);
  };

  const updateBbox = (field, value) => {
    const bbox = { ...localDetection.bbox };
    const maxW = imageRef.current?.naturalWidth || 9999;
    const maxH = imageRef.current?.naturalHeight || 9999;
    const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

    if (field === 'x1') {
      bbox.x1 = clamp(value, 0, maxW);
      bbox.x2 = Math.max(bbox.x1, bbox.x2);
    } else if (field === 'y1') {
      bbox.y1 = clamp(value, 0, maxH);
      bbox.y2 = Math.max(bbox.y1, bbox.y2);
    } else if (field === 'x2') {
      bbox.x2 = clamp(value, bbox.x1, maxW);
    } else if (field === 'y2') {
      bbox.y2 = clamp(value, bbox.y1, maxH);
    }
    
    bbox.width = bbox.x2 - bbox.x1;
    bbox.height = bbox.y2 - bbox.y1;
    return { ...localDetection, bbox };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Edit Detection</h3>
          <button
            onClick={onCancel}
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
              value={localDetection.class_name}
              onChange={(e) => setLocalDetection({ ...localDetection, class_name: e.target.value })}
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
              value={localDetection.class_id}
              onChange={(e) => setLocalDetection({ ...localDetection, class_id: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence: {(localDetection.confidence * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localDetection.confidence}
              onChange={(e) => setLocalDetection({ ...localDetection, confidence: parseFloat(e.target.value) })}
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
                value={localDetection.bbox.x1.toFixed(0)}
                onChange={(e) => setLocalDetection(updateBbox('x1', parseFloat(e.target.value) || 0))}
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
                value={localDetection.bbox.y1.toFixed(0)}
                onChange={(e) => setLocalDetection(updateBbox('y1', parseFloat(e.target.value) || 0))}
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
                value={localDetection.bbox.x2.toFixed(0)}
                onChange={(e) => setLocalDetection(updateBbox('x2', parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={localDetection.bbox.x1}
                max={imageRef.current?.naturalWidth || 9999}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Y2
              </label>
              <input
                type="number"
                value={localDetection.bbox.y2.toFixed(0)}
                onChange={(e) => setLocalDetection(updateBbox('y2', parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={localDetection.bbox.y1}
                max={imageRef.current?.naturalHeight || 9999}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
