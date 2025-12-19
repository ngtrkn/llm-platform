import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Object Detection APIs
export const detectObjects = async (formData) => {
  const response = await axios.post(`${API_BASE_URL}/cv/detect`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const detectBatch = async (files, options = {}) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  Object.entries(options).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const response = await axios.post(`${API_BASE_URL}/cv/detect/batch`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const listModels = async () => {
  const response = await api.get('/cv/models');
  return response.data;
};

export const getModelInfo = async (modelName) => {
  const response = await api.get(`/cv/models/${modelName}/info`);
  return response.data;
};

export const uploadModel = async (file, modelName = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (modelName) {
    formData.append('model_name', modelName);
  }
  const response = await axios.post(`${API_BASE_URL}/cv/models/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes timeout for large model files
  });
  return response.data;
};

export const downloadModel = async (modelName) => {
  const response = await axios.get(`${API_BASE_URL}/cv/models/${modelName}/download`, {
    responseType: 'blob',
    timeout: 300000, // 5 minutes timeout for large model files
  });
  // Create download link
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', modelName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return { success: true };
};

export const deleteModel = async (modelName) => {
  const response = await api.delete(`/cv/models/${modelName}`);
  return response.data;
};

export const getModelStatus = async (modelName) => {
  const response = await api.get(`/cv/models/${modelName}/status`);
  return response.data;
};

// Training APIs
export const trainModel = async (formData) => {
  const response = await axios.post(`${API_BASE_URL}/cv/train`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000, // 5 minutes timeout for training
  });
  return response.data;
};

export const trainFromFolder = async (
  datasetPath,
  baseModel = 'yolov8n.pt',
  epochs = 100,
  batchSize = 16,
  imgSize = 640,
  device = 'cpu',
  projectName = null
) => {
  const response = await api.post('/cv/train/from-folder', null, {
    params: {
      dataset_path: datasetPath,
      base_model: baseModel,
      epochs,
      batch_size: batchSize,
      img_size: imgSize,
      device,
      project_name: projectName,
    },
    timeout: 300000,
  });
  return response.data;
};

export const listTrainingProjects = async () => {
  const response = await api.get('/cv/train/projects');
  return response.data;
};

export const getTrainingProject = async (projectName) => {
  const response = await api.get(`/cv/train/projects/${projectName}`);
  return response.data;
};

export const resumeTraining = async (checkpointPath, epochs = null) => {
  const response = await api.post('/cv/train/resume', null, {
    params: {
      checkpoint_path: checkpointPath,
      epochs,
    },
    timeout: 300000,
  });
  return response.data;
};

// Health check API
export const checkCVServiceHealth = async () => {
  try {
    const response = await api.get('/cv/health', {
      timeout: 5000, // 5 second timeout for health checks
    });
    return response.data;
  } catch (error) {
    console.error('CV Service health check error:', error);
    // Return detailed error information
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      return {
        status: 'unhealthy',
        error: 'Cannot connect to backend API. Please ensure the backend is running on http://localhost:8000'
      };
    }
    return {
      status: 'unhealthy',
      error: error.response?.data?.error || error.response?.data?.detail || error.message || 'Unknown error'
    };
  }
};
