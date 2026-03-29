import api from './api';

export const clientService = {
  getAll: async (params = {}) => {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/clients', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/clients/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/clients/${id}`);
    return response.data;
  },
};

export const invoiceService = {
  getAll: async (params = {}) => {
    const response = await api.get('/invoices', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/invoices', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  },
};

export const invoiceLineService = {
  getAll: async (invoiceId) => {
    const response = await api.get(`/invoice-lines`, { params: { invoiceId } });
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/invoice-lines', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/invoice-lines/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/invoice-lines/${id}`);
    return response.data;
  },
};

export const productService = {
  getAll: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },
};

export const paymentService = {
  getAll: async (params = {}) => {
    const response = await api.get('/payments', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/payments', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/payments/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/payments/${id}`);
    return response.data;
  },
};

export const expenseService = {
  getAll: async (params = {}) => {
    const response = await api.get('/expenses', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/expenses', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/expenses/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },
};

export const reminderService = {
  getAll: async (params = {}) => {
    const response = await api.get('/reminders', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/reminders/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/reminders', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/reminders/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/reminders/${id}`);
    return response.data;
  },

  getUpcoming: async () => {
    const response = await api.get('/reminders/upcoming');
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/reminders/stats');
    return response.data;
  },

  sendBatch: async () => {
    const response = await api.post('/reminders/send-batch');
    return response.data;
  },
};

export const interactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/interactions', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/interactions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/interactions', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/interactions/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/interactions/${id}`);
    return response.data;
  },
};

export const auditLogService = {
  getAll: async (params = {}) => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/audit-logs/${id}`);
    return response.data;
  },
};

export const companyService = {
  getAll: async (params = {}) => {
    const response = await api.get('/companies', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },
};

export const cashTransactionService = {
  getAll: async (params = {}) => {
    const response = await api.get('/cash-transactions', { params });
    return response.data;
  },

  getSummary: async (params = {}) => {
    const response = await api.get('/cash-transactions/summary', { params });
    return response.data;
  },

  getChartData: async (params = {}) => {
    const response = await api.get('/cash-transactions/chart', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/cash-transactions/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/cash-transactions', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/cash-transactions/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/cash-transactions/${id}`);
    return response.data;
  },

  reconcile: async () => {
    const response = await api.post('/cash-transactions/reconcile');
    return response.data;
  },
};
