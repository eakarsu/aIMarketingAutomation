import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateMe: (data: any) => api.put('/auth/me', data),
  updateProfile: (data: any) => api.put('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
  updateNotifications: (data: any) => api.put('/auth/notifications', data),
  updateBranding: (data: any) => api.put('/auth/branding', data),
};

// Dashboard
export const dashboardAPI = {
  getOverview: () => api.get('/dashboard'),
  getQuickStats: () => api.get('/dashboard/quick-stats'),
  getActivity: (limit?: number) => api.get('/dashboard/activity', { params: { limit } }),
};

// Campaigns
export const campaignsAPI = {
  getAll: (params?: any) => api.get('/campaigns', { params }),
  getOne: (id: string) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: string, data: any) => api.put(`/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/campaigns/${id}`),
  send: (id: string) => api.post(`/campaigns/${id}/send`),
  schedule: (id: string, scheduledAt: string) => api.post(`/campaigns/${id}/schedule`, { scheduledAt }),
  duplicate: (id: string) => api.post(`/campaigns/${id}/duplicate`),
  getTypes: () => api.get('/campaigns/options/types'),
  getStatuses: () => api.get('/campaigns/options/statuses'),
};

// Contacts
export const contactsAPI = {
  getAll: (params?: any) => api.get('/contacts', { params }),
  getOne: (id: string) => api.get(`/contacts/${id}`),
  create: (data: any) => api.post('/contacts', data),
  update: (id: string, data: any) => api.put(`/contacts/${id}`, data),
  delete: (id: string) => api.delete(`/contacts/${id}`),
  bulkDelete: (ids: string[]) => api.post('/contacts/bulk-delete', { ids }),
  import: (contacts: any[], tagIds?: string[]) => api.post('/contacts/import', { contacts: contacts, tagIds }),
  exportCSV: () => api.get('/contacts/export/csv', { responseType: 'blob' }),
  optOut: (id: string) => api.post(`/contacts/${id}/opt-out`),
  getStatuses: () => api.get('/contacts/options/statuses'),
};

// Segments
export const segmentsAPI = {
  getAll: () => api.get('/segments'),
  getOne: (id: string) => api.get(`/segments/${id}`),
  create: (data: any) => api.post('/segments', data),
  update: (id: string, data: any) => api.put(`/segments/${id}`, data),
  delete: (id: string) => api.delete(`/segments/${id}`),
  refresh: (id: string) => api.post(`/segments/${id}/refresh`),
  addContacts: (id: string, contactIds: string[]) => api.post(`/segments/${id}/contacts`, { contactIds }),
  removeContact: (id: string, contactId: string) => api.delete(`/segments/${id}/contacts/${contactId}`),
};

// Tags
export const tagsAPI = {
  getAll: () => api.get('/tags'),
  getOne: (id: string) => api.get(`/tags/${id}`),
  create: (data: any) => api.post('/tags', data),
  update: (id: string, data: any) => api.put(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  addToContacts: (id: string, contactIds: string[]) => api.post(`/tags/${id}/contacts`, { contactIds }),
  removeFromContact: (id: string, contactId: string) => api.delete(`/tags/${id}/contacts/${contactId}`),
};

// Custom Fields
export const customFieldsAPI = {
  getAll: () => api.get('/custom-fields'),
  getOne: (id: string) => api.get(`/custom-fields/${id}`),
  create: (data: any) => api.post('/custom-fields', data),
  update: (id: string, data: any) => api.put(`/custom-fields/${id}`, data),
  delete: (id: string) => api.delete(`/custom-fields/${id}`),
  getTypes: () => api.get('/custom-fields/options/types'),
};

// Templates
export const templatesAPI = {
  getAll: (params?: any) => api.get('/templates', { params }),
  getOne: (id: string) => api.get(`/templates/${id}`),
  create: (data: any) => api.post('/templates', data),
  update: (id: string, data: any) => api.put(`/templates/${id}`, data),
  delete: (id: string) => api.delete(`/templates/${id}`),
  duplicate: (id: string) => api.post(`/templates/${id}/duplicate`),
  getTypes: () => api.get('/templates/options/types'),
  getCategories: () => api.get('/templates/options/categories'),
};

// Automations
export const automationsAPI = {
  getAll: (params?: any) => api.get('/automations', { params }),
  getOne: (id: string) => api.get(`/automations/${id}`),
  create: (data: any) => api.post('/automations', data),
  update: (id: string, data: any) => api.put(`/automations/${id}`, data),
  delete: (id: string) => api.delete(`/automations/${id}`),
  activate: (id: string) => api.post(`/automations/${id}/activate`),
  pause: (id: string) => api.post(`/automations/${id}/pause`),
  enroll: (id: string, contactIds: string[]) => api.post(`/automations/${id}/enroll`, { contactIds }),
  getTypes: () => api.get('/automations/options/types'),
  getStepTypes: () => api.get('/automations/options/step-types'),
};

// Landing Pages
export const landingPagesAPI = {
  getAll: (params?: any) => api.get('/landing-pages', { params }),
  getOne: (id: string) => api.get(`/landing-pages/${id}`),
  create: (data: any) => api.post('/landing-pages', data),
  update: (id: string, data: any) => api.put(`/landing-pages/${id}`, data),
  delete: (id: string) => api.delete(`/landing-pages/${id}`),
  publish: (id: string) => api.post(`/landing-pages/${id}/publish`),
  unpublish: (id: string) => api.post(`/landing-pages/${id}/unpublish`),
  duplicate: (id: string) => api.post(`/landing-pages/${id}/duplicate`),
};

// Forms
export const formsAPI = {
  getAll: () => api.get('/forms'),
  getOne: (id: string) => api.get(`/forms/${id}`),
  create: (data: any) => api.post('/forms', data),
  update: (id: string, data: any) => api.put(`/forms/${id}`, data),
  delete: (id: string) => api.delete(`/forms/${id}`),
  getSubmissions: (id: string, params?: any) => api.get(`/forms/${id}/submissions`, { params }),
  exportSubmissions: (id: string) => api.get(`/forms/${id}/submissions/export`, { responseType: 'blob' }),
};

// Images
export const imagesAPI = {
  getAll: (params?: any) => api.get('/images', { params }),
  getOne: (id: string) => api.get(`/images/${id}`),
  upload: (file: File, name?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    return api.post('/images/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post('/images/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (id: string, data: any) => api.put(`/images/${id}`, data),
  delete: (id: string) => api.delete(`/images/${id}`),
  bulkDelete: (ids: string[]) => api.post('/images/bulk-delete', { ids }),
};

// Analytics
export const analyticsAPI = {
  getCampaign: (id: string) => api.get(`/analytics/campaigns/${id}`),
  getDashboard: (period?: number) => api.get('/analytics/dashboard', { params: { period } }),
  getABTest: (id: string) => api.get(`/analytics/ab-tests/${id}`),
  createABTest: (data: any) => api.post('/analytics/ab-tests', data),
  endABTest: (id: string, winnerVariant: string) => api.post(`/analytics/ab-tests/${id}/end`, { winnerVariant }),
  trackConversion: (data: any) => api.post('/analytics/conversions', data),
  getROI: (startDate?: string, endDate?: string) => api.get('/analytics/roi', { params: { startDate, endDate } }),
};

// Reviews
export const reviewsAPI = {
  getAll: (params?: any) => api.get('/reviews', { params }),
  getStats: () => api.get('/reviews/stats'),
  getOne: (id: string) => api.get(`/reviews/${id}`),
  create: (data: any) => api.post('/reviews', data),
  update: (id: string, data: any) => api.put(`/reviews/${id}`, data),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  respond: (id: string, response: string) => api.post(`/reviews/${id}/respond`, { response }),
  ignore: (id: string) => api.post(`/reviews/${id}/ignore`),
  sendRequest: (data: any) => api.post('/reviews/request', data),
  getPlatforms: () => api.get('/reviews/options/platforms'),
};

// Integrations
export const integrationsAPI = {
  getAll: (params?: any) => api.get('/integrations', { params }),
  getOne: (id: string) => api.get(`/integrations/${id}`),
  create: (data: any) => api.post('/integrations', data),
  update: (id: string, data: any) => api.put(`/integrations/${id}`, data),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  test: (id: string) => api.post(`/integrations/${id}/test`),
  sync: (id: string) => api.post(`/integrations/${id}/sync`),
  activate: (id: string) => api.post(`/integrations/${id}/activate`),
  deactivate: (id: string) => api.post(`/integrations/${id}/deactivate`),
  getTypes: () => api.get('/integrations/options/types'),
};

// AI
export const aiAPI = {
  generateContent: (data: any) => api.post('/ai/content', data),
  generateSubjectLines: (content: string, count?: number) => api.post('/ai/subject-lines', { content, count }),
  optimizeSubject: (data: { content: string; count?: number }) => api.post('/ai/subject-lines', data),
  getSendTime: (data: any) => api.post('/ai/send-time', data),
  optimizeSendTime: (data: any) => api.post('/ai/send-time', data),
  getSegmentSuggestions: (data?: any) => api.post('/ai/segment', data || {}),
  suggestSegments: (data?: any) => api.post('/ai/segment', data || {}),
  getCampaignIdeas: (data: any) => api.post('/ai/campaign-ideas', data),
  suggestCampaign: (data?: any) => api.post('/ai/campaign-ideas', data || {}),
  generateReviewResponse: (data: any) => api.post('/ai/review-response', data),
  generateSocialPost: (data: any) => api.post('/ai/social-post', data),
  generateAdCopy: (data: any) => api.post('/ai/ad-copy', data),
  generateAd: (data: any) => api.post('/ai/ad-copy', data),
  predict: (data: any) => api.post('/ai/predict', data),
  generateImage: (data: any) => api.post('/ai/image', data),
  getHistory: (type?: string, limit?: number) => api.get('/ai/history', { params: { type, limit } }),
};

// Options (for dropdowns)
export const optionsAPI = {
  getAll: () => api.get('/options/all'),
  getCampaignTypes: () => api.get('/options/campaign-types'),
  getCampaignStatuses: () => api.get('/options/campaign-statuses'),
  getTemplateTypes: () => api.get('/options/template-types'),
  getTemplateCategories: () => api.get('/options/template-categories'),
  getAutomationTypes: () => api.get('/options/automation-types'),
  getAutomationStatuses: () => api.get('/options/automation-statuses'),
  getAutomationStepTypes: () => api.get('/options/automation-step-types'),
  getContactStatuses: () => api.get('/options/contact-statuses'),
  getContactSources: () => api.get('/options/contact-sources'),
  getReviewPlatforms: () => api.get('/options/review-platforms'),
  getReviewStatuses: () => api.get('/options/review-statuses'),
  getIntegrationTypes: () => api.get('/options/integration-types'),
  getIntegrationProviders: () => api.get('/options/integration-providers'),
  getFormFieldTypes: () => api.get('/options/form-field-types'),
  getCustomFieldTypes: () => api.get('/options/custom-field-types'),
  getSegmentRuleFields: () => api.get('/options/segment-rule-fields'),
  getSegmentRuleOperators: () => api.get('/options/segment-rule-operators'),
  getAIContentTypes: () => api.get('/options/ai-content-types'),
  getAITones: () => api.get('/options/ai-tones'),
  getSocialPlatforms: () => api.get('/options/social-platforms'),
  getAdPlatforms: () => api.get('/options/ad-platforms'),
  getTimezones: () => api.get('/options/timezones'),
  getAnalyticsPeriods: () => api.get('/options/analytics-periods'),
  getRatings: () => api.get('/options/ratings'),
};

export default api;
