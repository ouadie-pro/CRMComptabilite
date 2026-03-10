const express = require('express');
const Router = express.Router();
const {
  getAllAuditLogs,
  getAuditLogById,
  createAuditLog
} = require('../controllers/AuditLog');

Router.get('/', getAllAuditLogs);
Router.get('/:id', getAuditLogById);
Router.post('/', createAuditLog);

module.exports = Router;
