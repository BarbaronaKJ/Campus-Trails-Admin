import axios from 'axios';

// Use environment variable for API URL (set in Vercel/Render)
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';
const API_URL = `${BASE_API_URL}/api/admin`;

// Debug: Log the API URL (remove in production)
console.log('🔍 Services API URL:', API_URL);

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const pinsAPI = {
  getAll: (params) => axios.get(`${API_URL}/pins`, { params, ...getAuthHeaders() }),
  getById: (id) => axios.get(`${API_URL}/pins/${id}`, getAuthHeaders()),
  create: (data) => axios.post(`${API_URL}/pins`, data, getAuthHeaders()),
  update: (id, data) => axios.put(`${API_URL}/pins/${id}`, data, getAuthHeaders()),
  delete: (id) => axios.delete(`${API_URL}/pins/${id}`, getAuthHeaders())
};

export const usersAPI = {
  getAll: (params) => axios.get(`${API_URL}/users`, { params, ...getAuthHeaders() }),
  getById: (id) => axios.get(`${API_URL}/users/${id}`, getAuthHeaders()),
  update: (id, data) => axios.put(`${API_URL}/users/${id}`, data, getAuthHeaders()),
  delete: (id) => axios.delete(`${API_URL}/users/${id}`, getAuthHeaders())
};

export const campusesAPI = {
  getAll: () => axios.get(`${API_URL}/campuses`, getAuthHeaders()),
  getById: (id) => axios.get(`${API_URL}/campuses/${id}`, getAuthHeaders()),
  create: (data) => axios.post(`${API_URL}/campuses`, data, getAuthHeaders()),
  update: (id, data) => axios.put(`${API_URL}/campuses/${id}`, data, getAuthHeaders()),
  delete: (id) => axios.delete(`${API_URL}/campuses/${id}`, getAuthHeaders())
};

export const notificationsAPI = {
  getAll: (params) => axios.get(`${API_URL}/notifications`, { params, ...getAuthHeaders() }),
  send: (data) => axios.post(`${API_URL}/notifications/send`, data, getAuthHeaders())
};

export const feedbacksAPI = {
  getAll: (params) => axios.get(`${API_URL}/feedbacks`, { params, ...getAuthHeaders() }),
  getById: (id) => axios.get(`${API_URL}/feedbacks/${id}`, getAuthHeaders()),
  delete: (id) => axios.delete(`${API_URL}/feedbacks/${id}`, getAuthHeaders())
};

export const developersAPI = {
  getAll: () => axios.get(`${API_URL}/developers`, getAuthHeaders()),
  getById: (id) => axios.get(`${API_URL}/developers/${id}`, getAuthHeaders()),
  create: (data) => axios.post(`${API_URL}/developers`, data, getAuthHeaders()),
  update: (id, data) => axios.put(`${API_URL}/developers/${id}`, data, getAuthHeaders()),
  delete: (id) => axios.delete(`${API_URL}/developers/${id}`, getAuthHeaders())
};

export const suggestionsAndFeedbacksAPI = {
  getAll: (params) => axios.get(`${API_URL}/suggestions_and_feedbacks`, { params, ...getAuthHeaders() }),
  getById: (id) => axios.get(`${API_URL}/suggestions_and_feedbacks/${id}`, getAuthHeaders()),
  update: (id, data) => axios.put(`${API_URL}/suggestions_and_feedbacks/${id}`, data, getAuthHeaders()),
  delete: (id) => axios.delete(`${API_URL}/suggestions_and_feedbacks/${id}`, getAuthHeaders())
};

// Analytics API (uses main API, not admin API)
const MAIN_API_URL = BASE_API_URL.replace('/api/admin', '') || BASE_API_URL;
export const analyticsAPI = {
  getStats: (params) => axios.get(`${MAIN_API_URL}/api/analytics/stats`, { params, ...getAuthHeaders() }),
  getPopularRoutes: (params) => axios.get(`${MAIN_API_URL}/api/analytics/popular-routes`, { params, ...getAuthHeaders() }),
  getPopularSearches: (params) => axios.get(`${MAIN_API_URL}/api/analytics/popular-searches`, { params, ...getAuthHeaders() })
};

// Profile API
export const profileAPI = {
  updateProfile: (data) => axios.put(`${API_URL}/auth/profile`, data, getAuthHeaders()),
  changePassword: (data) => axios.put(`${API_URL}/auth/change-password`, data, getAuthHeaders())
};

// Auth API (for forgot password)
export const authAPI = {
  forgotPassword: (email) => axios.post(`${API_URL}/auth/forgot-password`, { email }),
  resetPassword: (data) => axios.post(`${API_URL}/auth/reset-password`, data)
};
