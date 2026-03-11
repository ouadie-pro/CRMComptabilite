import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  changePassword: async (id, oldPassword, newPassword) => {
    const response = await api.put(`/users/${id}/password`, { oldPassword, newPassword });
    return response.data;
  },
};
