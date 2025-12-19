import { Edit, Trash2 } from 'lucide-react';

/**
 * Detection List Component
 * Displays list of detections with edit/delete actions
 */
export default function DetectionList({
  detections,
  selectedDetectionId,
  editingDetection,
  onSelectDetection,
  onEditDetection,
  onDeleteDetection
}) {
  if (!detections || detections.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Detection Results</h3>
      <div className="space-y-2">
        {detections.map((detection) => {
          const isSelected = selectedDetectionId === detection.id;
          const isEditing = editingDetection && editingDetection.id === detection.id;
          
          return (
            <div
              key={detection.id}
              onClick={() => onSelectDetection(detection.id)}
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
                      onClick={() => onEditDetection(detection)}
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
                      onClick={() => onDeleteDetection(detection.id)}
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
    </div>
  );
}
