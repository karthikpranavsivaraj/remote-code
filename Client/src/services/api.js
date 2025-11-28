import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'
const FULL_API_URL = `${API_URL}/api`

const api = axios.create({
  baseURL: FULL_API_URL,
})

console.log('API URL:', FULL_API_URL)

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  console.log('API Request - Token present:', !!token)
  console.log('API Request - URL:', config.url)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('API Request - Authorization header set')
  } else {
    console.log('API Request - No token available')
  }
  return config
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  register: (email, username, password) =>
    api.post('/auth/register', { email, username, password }),
  me: () => api.get('/auth/me'),
}

export const projectAPI = {
  getProjects: () => api.get('/projects'),
  createProject: (name, description, github_repo) =>
    api.post('/projects', { name, description, github_repo }),
  getProject: (id) => api.get(`/projects/${id}`),
  updateProject: (id, name, description) =>
    api.put(`/projects/${id}`, { name, description }),
  deleteProject: (id) => api.delete(`/projects/${id}`),
  getProjectFiles: (id) => api.get(`/projects/${id}/files`),
  addMember: (id, email, role, modules) =>
    api.post(`/projects/${id}/members`, { email, role, modules }),
  getMembers: (id) => api.get(`/projects/${id}/members`),
  updateMember: (id, userId, data) =>
    api.put(`/projects/${id}/members/${userId}`, data),
  removeMember: (id, userId) =>
    api.delete(`/projects/${id}/members/${userId}`),
  getTasks: (id) => api.get(`/projects/${id}/tasks`),
  createTask: (id, task) =>
    api.post(`/projects/${id}/tasks`, task),
  updateTask: (id, taskId, data) =>
    api.put(`/projects/${id}/tasks/${taskId}`, data),
  saveFile: (projectId, fileId, content) =>
    api.put(`/projects/${projectId}/files/${fileId}`, { content }),
  toggleLiveRoom: (id, active) =>
    api.put(`/projects/${id}/live-room`, { active }),
  getUncommittedChanges: (id) =>
    api.get(`/projects/${id}/changes`),
  commitChanges: (id, fileIds, commitMessage, githubToken) =>
    api.post(`/projects/${id}/commit`, { fileIds, commitMessage, githubToken }),
}

export const githubAPI = {
  importFiles: (projectId, github_token, github_url) => {
    console.log('API call to:', `/github/import/${projectId}`);
    return api.post(`/github/import/${projectId}`, { github_token, github_url });
  },
  importLocalFiles: (projectId, formData) =>
    api.post(`/github/import-local/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
}

export const commentsAPI = {
  getFileComments: (fileId) => api.get(`/comments/file/${fileId}`),
  addComment: (fileId, lineNumber, comment, subtasks) =>
    api.post('/comments', { file_id: fileId, line_number: lineNumber, comment, subtasks }),
  updateComment: (commentId, status) =>
    api.put(`/comments/${commentId}`, { status }),
}

export const sessionAPI = {
  getProjectSessions: (projectId) =>
    api.get(`/sessions/project/${projectId}`),
  createSession: (projectId, name) =>
    api.post('/sessions', { projectId, name }),
  getSession: (id) => api.get(`/sessions/${id}`),
  addParticipant: (sessionId, email, role) =>
    api.post(`/sessions/${sessionId}/participants`, { email, role }),
  removeParticipant: (sessionId, userId) =>
    api.delete(`/sessions/${sessionId}/participants/${userId}`),
}

export const codeAPI = {
  executeCode: (code, language, sessionId) =>
    api.post('/code/execute', { code, language, sessionId }),
  getFile: (fileId) => api.get(`/code/files/${fileId}`),
  createFile: (sessionId, filename, language, content) =>
    api.post('/code/files', { sessionId, filename, language, content }),
}

export const aiAPI = {
  explainCode: (code, language) =>
    api.post('/ai/explain', { code, language }),
  generateDocs: (projectId, code, language, title) =>
    api.post('/ai/generate-docs', { projectId, code, language, title }),
  suggestImprovements: (code, language) =>
    api.post('/ai/suggest', { code, language }),
}

export const chatAPI = {
  getProjects: () => api.get('/chat/projects'),
  getMessages: (chatId, page = 1, limit = 50) =>
    api.get(`/chat/rooms/${chatId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (chatId, message) =>
    api.post(`/chat/rooms/${chatId}/messages`, { message }),
}

export const reviewAPI = {
  createReview: (data) => api.post('/reviews/create', data),
  getProjectReviews: (projectId) => api.get(`/reviews/project/${projectId}`),
  respondToReview: (data) => api.post('/reviews/respond', data),
  getCodeSnapshot: (data) => api.post('/snapshot', data),
}

export const notificationAPI = {
  getNotifications: (userId) => api.get(`/notifications/${userId}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  createNotification: (data) => api.post('/notifications', data),
  respondToNotification: (id, action) => api.put(`/notifications/${id}/respond`, { action }),
}

export const standupAPI = {
  createStandup: (data) => api.post('/standups', data),
  getStandups: (projectId, date) => api.get(`/standups/${projectId}/${date || ''}`),
}

export default api