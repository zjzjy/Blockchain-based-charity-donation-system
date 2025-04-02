import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 项目所有者相关API
export const registerProjectOwner = (data) => {
  return api.post('/projectOwner/register', data);
};

export const getProjectOwner = (projectOwnerId) => {
  return api.get(`/projectOwner/${projectOwnerId}`);
};

export const updateProjectOwner = (projectOwnerId, data) => {
  return api.put(`/projectOwner/${projectOwnerId}`, data);
};

// 捐赠者相关API
export const registerDonor = (data) => {
  return api.post('/donor', data);
};

export const getDonor = (donorId) => {
  return api.get(`/donor/${donorId}`);
};

export const verifyDonor = (donorId, isVerified) => {
  return api.put(`/donor/${donorId}/verify`, { isVerified });
};

// 项目相关API
export const createProject = (data) => {
  return api.post('/project', data);
};

export const getProject = (projectId) => {
  return api.get(`/project/${projectId}`);
};

export const updateProjectStatus = (projectId, newStatus) => {
  return api.put(`/project/${projectId}/status`, { newStatus });
};

export const getProjectList = (params) => {
  return api.get('/project', { params });
};

export const addMilestone = (projectId, data) => {
  return api.post(`/project/${projectId}/milestone`, data);
};

// 捐赠相关API
export const makeDonation = (data) => {
  return api.post('/donation', data);
};

export const getDonationHistory = (donorId) => {
  return api.get(`/donation/donor/${donorId}`);
};

export const getProjectDonations = (projectId) => {
  return api.get(`/donation/project/${projectId}`);
};

export const allocateFunds = (data) => {
  return api.post('/donation/allocate', data);
};

// 里程碑相关API
export const getMilestones = (projectId) => {
  return api.get(`/milestone/project/${projectId}`);
};

export const getMilestone = (projectId, milestoneId) => {
  return api.get(`/milestone/${projectId}/${milestoneId}`);
};

export const updateMilestone = (projectId, milestoneId, data) => {
  return api.put(`/milestone/${projectId}/${milestoneId}`, data);
};

// 用户认证相关API
export const login = (credentials) => {
  return api.post('/auth/login', credentials);
};

export const register = (userData) => {
  return api.post('/auth/register', userData);
};

export const logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export default api; 