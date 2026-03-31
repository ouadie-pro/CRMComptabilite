const Budget = require('../models/BudgetSchema');
const Expense = require('../models/ExpenseSchema');

const getAllBudgets = async (req, res) => {
  try {
    const { year } = req.query;
    const query = year ? { year: parseInt(year) } : { year: new Date().getFullYear() };
    const budgets = await Budget.find(query);
    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBudgetByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { year } = req.query;
    const queryYear = year ? parseInt(year) : new Date().getFullYear();
    
    const budget = await Budget.findOne({ category, year: queryYear });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found for this category' });
    }
    
    const startDate = new Date(queryYear, 0, 1);
    const endDate = new Date(queryYear, 11, 31, 23, 59, 59);
    
    const expenses = await Expense.aggregate([
      { $match: { 
        category, 
        date: { $gte: startDate, $lte: endDate },
        status: 'approved'
      }},
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const spent = expenses.length > 0 ? expenses[0].total : 0;
    
    res.status(200).json({
      ...budget.toObject(),
      spent,
      remaining: budget.amount - spent,
      percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const setBudget = async (req, res) => {
  try {
    const { category, amount, period, year } = req.body;
    
    if (!category || amount === undefined) {
      return res.status(400).json({ message: 'Category and amount are required' });
    }
    
    const budgetYear = year || new Date().getFullYear();
    
    const budget = await Budget.findOneAndUpdate(
      { category, year: budgetYear },
      { category, amount, period: period || 'monthly', year: budgetYear },
      { new: true, upsert: true }
    );
    
    res.status(200).json({ message: 'Budget saved', budget });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByIdAndDelete(id);
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.status(200).json({ message: 'Budget deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getBudgetSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const queryYear = year ? parseInt(year) : new Date().getFullYear();
    
    const budgets = await Budget.find({ year: queryYear });
    
    const startDate = new Date(queryYear, 0, 1);
    const endDate = new Date(queryYear, 11, 31, 23, 59, 59);
    
    const expensesByCategory = await Expense.aggregate([
      { $match: { 
        date: { $gte: startDate, $lte: endDate },
        status: 'approved'
      }},
      { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);
    
    const expenseMap = {};
    expensesByCategory.forEach(e => {
      expenseMap[e._id] = e.total;
    });
    
    const summary = budgets.map(budget => ({
      category: budget.category,
      budgeted: budget.amount,
      spent: expenseMap[budget.category] || 0,
      remaining: budget.amount - (expenseMap[budget.category] || 0),
      percentage: budget.amount > 0 ? Math.round(((expenseMap[budget.category] || 0) / budget.amount) * 100) : 0,
    }));
    
    const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = Object.values(expenseMap).reduce((sum, v) => sum + v, 0);
    
    res.status(200).json({
      year: queryYear,
      categories: summary,
      totals: {
        budgeted: totalBudgeted,
        spent: totalSpent,
        remaining: totalBudgeted - totalSpent,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllBudgets,
  getBudgetByCategory,
  setBudget,
  deleteBudget,
  getBudgetSummary,
};
