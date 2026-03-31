const Expense = require('../models/ExpenseSchema');
const CashTransaction = require('../models/CashTransactionSchema');
const logAudit = require('../utils/auditLogger');

const bulkApproveExpenses = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs des dépenses requis' });
    }
    
    const result = await Expense.updateMany(
      { _id: { $in: ids } },
      { status: 'approved' },
      { new: true }
    );
    
    await logAudit({
      userId: req.user?._id,
      action: "bulk_approve",
      entity: "Expense",
      entityId: ids.join(','),
      changes: { approvedCount: result.modifiedCount },
      req
    });
    
    res.status(200).json({ message: `${result.modifiedCount} dépense(s) approuvée(s)`, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const bulkRejectExpenses = async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs des dépenses requis' });
    }
    
    const result = await Expense.updateMany(
      { _id: { $in: ids } },
      { status: 'rejected' },
      { new: true }
    );
    
    await logAudit({
      userId: req.user?._id,
      action: "bulk_reject",
      entity: "Expense",
      entityId: ids.join(','),
      changes: { rejectedCount: result.modifiedCount },
      req
    });
    
    res.status(200).json({ message: `${result.modifiedCount} dépense(s) rejetée(s)`, modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAllExpenses = async (req, res) => {
  try {
    const { category, status, startDate, endDate } = req.query;
    let query = {};

    if (category) query.category = category;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.status(200).json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.status(200).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createExpense = async (req, res) => {
  try {
    const expense = new Expense({
      ...req.body,
      userId: req.user?._id || req.body.userId
    });
    await expense.save();
    
    await CashTransaction.createFromExpense(expense, req.user?._id);
    
    await logAudit({
      userId: req.user?._id,
      action: "create",
      entity: "Expense",
      entityId: expense._id,
      changes: { description: expense.description, amount: expense.amount, category: expense.category, status: expense.status },
      req
    });
    res.status(201).json({ message: 'Expense created successfully', expense });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    await CashTransaction.createFromExpense(expense, req.user?._id);
    
    await logAudit({
      userId: req.user?._id,
      action: "update",
      entity: "Expense",
      entityId: expense._id,
      changes: req.body,
      req
    });
    res.status(200).json({ message: 'Expense updated successfully', expense });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    await CashTransaction.deleteBySourceId(expense._id);
    
    await logAudit({
      userId: req.user?._id,
      action: "delete",
      entity: "Expense",
      entityId: req.params.id,
      changes: { message: "Expense deleted" },
      req
    });
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  bulkApproveExpenses,
  bulkRejectExpenses
};
