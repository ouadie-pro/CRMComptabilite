const express = require('express');
const Router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
} = require('../controllers/Invoice');

Router.get('/', getAllInvoices);
Router.get('/:id', getInvoiceById);
Router.post('/', createInvoice);
Router.put('/:id', updateInvoice);
Router.delete('/:id', deleteInvoice);

module.exports = Router;
