import { useState, useEffect, useCallback } from 'react';
import DetectionManager from '../utils/detectionManager';

/**
 * Custom hook for managing detection state
 */
export function useDetections(initialDetections = [], nextIdStart = 1000) {
  const [detections, setDetections] = useState([]);
  const [selectedDetectionId, setSelectedDetectionId] = useState(null);
  const [editingDetection, setEditingDetection] = useState(null);
  const [manager] = useState(() => new DetectionManager(nextIdStart));

  // Initialize manager with initial detections
  useEffect(() => {
    if (initialDetections && initialDetections.length > 0) {
      manager.initializeNextId(initialDetections);
      const processed = manager.processDetections(initialDetections);
      setDetections(processed);
    }
  }, [initialDetections, manager]);

  // Process new detections from API
  const updateDetections = useCallback((newDetections) => {
    if (!newDetections || !newDetections.detections) {
      setDetections([]);
      return;
    }
    
    const processed = manager.processDetections(newDetections.detections);
    manager.initializeNextId(processed);
    setDetections(processed);
  }, [manager]);

  // Select detection
  const selectDetection = useCallback((detectionId) => {
    setSelectedDetectionId(prev => prev === detectionId ? null : detectionId);
  }, []);

  // Start editing detection
  const startEdit = useCallback((detection) => {
    setEditingDetection({ ...detection });
    setSelectedDetectionId(detection.id);
  }, []);

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingDetection(null);
  }, []);

  // Save edited detection
  const saveEdit = useCallback((updates) => {
    if (!editingDetection) return;
    
    setDetections(prev => 
      manager.updateDetection(prev, editingDetection.id, updates)
    );
    setEditingDetection(null);
  }, [editingDetection, manager]);

  // Delete detection
  const deleteDetection = useCallback((detectionId) => {
    setDetections(prev => manager.deleteDetection(prev, detectionId));
    if (editingDetection && editingDetection.id === detectionId) {
      setEditingDetection(null);
    }
    if (selectedDetectionId === detectionId) {
      setSelectedDetectionId(null);
    }
  }, [editingDetection, selectedDetectionId, manager]);

  // Create new detection (without auto-opening editor)
  const createDetection = useCallback((bbox, classId = 0, className = 'object', confidence = 0.5, autoEdit = false) => {
    const newDetection = manager.createDetection(bbox, classId, className, confidence);
    setDetections(prev => [...prev, newDetection]);
    setSelectedDetectionId(newDetection.id);
    // Only open editor if explicitly requested
    if (autoEdit) {
      setEditingDetection(newDetection);
    }
    return newDetection;
  }, [manager]);

  // Clear all detections
  const clearDetections = useCallback(() => {
    setDetections([]);
    setSelectedDetectionId(null);
    setEditingDetection(null);
  }, []);

  return {
    detections,
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
  };
}
