const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkApproveExpenses,
  bulkRejectExpenses
} = require('../controllers/Expense');

Router.use(authMiddleware);

Router.get('/', getAllExpenses);
Router.get('/:id', getExpenseById);
Router.post('/', createExpense);
Router.put('/:id', updateExpense);
Router.delete('/:id', deleteExpense);
Router.post('/bulk-approve', bulkApproveExpenses);
Router.post('/bulk-reject', bulkRejectExpenses);

module.exports = Router;
