const express = require('express');
const Router = express.Router();
const { authMiddleware, requireRole } = require('../controllers/User');
const {
  getAllAuditLogs,
  getAuditLogById,
  createAuditLog
} = require('../controllers/AuditLog');

Router.use(authMiddleware);

Router.get('/', requireRole('admin', 'directeur'), getAllAuditLogs);
Router.get('/:id', requireRole('admin', 'directeur'), getAuditLogById);
Router.post('/', createAuditLog);

module.exports = Router;
