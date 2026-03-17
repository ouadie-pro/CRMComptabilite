const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense
} = require('../controllers/Expense');

Router.use(authMiddleware);

Router.get('/', getAllExpenses);
Router.get('/:id', getExpenseById);
Router.post('/', createExpense);
Router.put('/:id', updateExpense);
Router.delete('/:id', deleteExpense);

module.exports = Router;
