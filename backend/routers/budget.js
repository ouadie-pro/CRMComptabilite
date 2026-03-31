const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllBudgets,
  getBudgetByCategory,
  setBudget,
  deleteBudget,
  getBudgetSummary,
} = require('../controllers/Budget');

Router.use(authMiddleware);

Router.get('/', getAllBudgets);
Router.get('/summary', getBudgetSummary);
Router.get('/category/:category', getBudgetByCategory);
Router.post('/', setBudget);
Router.delete('/:id', deleteBudget);

module.exports = Router;
