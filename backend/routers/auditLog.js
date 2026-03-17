const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllAuditLogs,
  getAuditLogById,
  createAuditLog
} = require('../controllers/AuditLog');

Router.use(authMiddleware);

Router.get('/', getAllAuditLogs);
Router.get('/:id', getAuditLogById);
Router.post('/', createAuditLog);

module.exports = Router;
