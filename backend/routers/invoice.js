const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoiceEmail
} = require('../controllers/Invoice');

Router.use(authMiddleware);

Router.get('/', getAllInvoices);
Router.get('/:id', getInvoiceById);
Router.post('/', createInvoice);
Router.put('/:id', updateInvoice);
Router.delete('/:id', deleteInvoice);
Router.post('/:id/send-email', sendInvoiceEmail);

module.exports = Router;
