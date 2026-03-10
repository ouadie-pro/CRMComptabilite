const express = require('express');
const Router = express.Router();
const {
  getAllInvoiceLines,
  getInvoiceLineById,
  createInvoiceLine,
  updateInvoiceLine,
  deleteInvoiceLine
} = require('../controllers/InvoiceLine');

Router.get('/', getAllInvoiceLines);
Router.get('/:id', getInvoiceLineById);
Router.post('/', createInvoiceLine);
Router.put('/:id', updateInvoiceLine);
Router.delete('/:id', deleteInvoiceLine);

module.exports = Router;
