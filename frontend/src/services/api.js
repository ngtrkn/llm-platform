import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getProviders = async () => {
  const response = await api.get('/providers');
  return response.data;
};

export const generateText = async (provider, prompt, options = {}) => {
  const response = await api.post('/generate', {
    provider,
    prompt,
    ...options,
  });
  return response.data;
};

export const chat = async (provider, messages, options = {}) => {
  const response = await api.post('/chat', {
    provider,
    messages,
    ...options,
  });
  return response.data;
};

export const listConversations = async (dbType, userId, limit = 10) => {
  const response = await api.get(`/conversations/${dbType}/${userId}`, {
    params: { limit },
  });
  return response.data;
};

export const getConversation = async (dbType, conversationId) => {
  const response = await api.get(`/conversations/${dbType}/${conversationId}`);
  return response.data;
};
