const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  reconcileTransactions,
  getChartData
} = require('../controllers/CashTransaction');

Router.use(authMiddleware);

Router.get('/', getAllTransactions);
Router.get('/summary', getSummary);
Router.get('/chart', getChartData);
Router.post('/reconcile', reconcileTransactions);
Router.get('/:id', getTransactionById);
Router.post('/', createTransaction);
Router.put('/:id', updateTransaction);
Router.delete('/:id', deleteTransaction);

module.exports = Router;
