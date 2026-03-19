const Expense = require('../models/ExpenseSchema');
const CashTransaction = require('../models/CashTransactionSchema');
const logAudit = require('../utils/auditLogger');

const categoryMap = {
  'salaire': 'salary',
  'loyer': 'rent',
  'services': 'service',
  'fournitures': 'supply',
  'transport': 'transport',
  'autre': 'other',
  'salary': 'salary',
  'rent': 'rent',
  'service': 'service',
  'supply': 'supply',
  'utility': 'utility',
  'deposit': 'deposit',
  'withdrawal': 'withdrawal'
};

const mapExpenseCategory = (category) => {
  return categoryMap[category] || 'other';
};

const createOrUpdateCashTransactionFromExpense = async (expense) => {
  try {
    const existingTransaction = await CashTransaction.findOne({ sourceId: expense._id });
    const statusLabel = expense.status === 'approved' ? 'Approuvé' : expense.status === 'pending' ? 'En attente' : expense.status === 'rejected' ? 'Rejeté' : expense.status;
    const description = expense.vendor 
      ? `${expense.description} - ${expense.vendor} [${statusLabel}]`
      : `${expense.description} [${statusLabel}]`;
    
    if (existingTransaction) {
      existingTransaction.amount = expense.amount;
      existingTransaction.method = expense.paymentMethod || 'cash';
      existingTransaction.date = expense.date || new Date();
      existingTransaction.description = description;
      existingTransaction.category = mapExpenseCategory(expense.category);
      existingTransaction.status = expense.status === 'approved' ? 'confirmed' : expense.status === 'pending' ? 'pending' : 'rejected';
      await existingTransaction.save();
      return existingTransaction;
    }

    const cashTransaction = new CashTransaction({
      type: 'out',
      amount: expense.amount,
      method: expense.paymentMethod || 'cash',
      date: expense.date || new Date(),
      description: description,
      source: 'expense',
      category: mapExpenseCategory(expense.category),
      sourceId: expense._id,
      reference: `EXP-${expense._id}`,
      linkedInvoiceId: null,
      linkedExpenseId: expense._id,
      userId: expense.userId,
      status: expense.status === 'approved' ? 'confirmed' : expense.status === 'pending' ? 'pending' : 'rejected'
    });
    await cashTransaction.save();
    return cashTransaction;
  } catch (error) {
    console.error('Error creating/updating cash transaction from expense:', error);
    return null;
  }
};

const deleteCashTransactionBySourceId = async (sourceId) => {
  try {
    await CashTransaction.findOneAndDelete({ sourceId });
  } catch (error) {
    console.error('Error deleting cash transaction:', error);
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
      if (endDate) query.date.$lte = new Date(endDate);
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
    
    await createOrUpdateCashTransactionFromExpense(expense);
    
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
    const oldExpense = await Expense.findById(req.params.id);
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    
    await createOrUpdateCashTransactionFromExpense(expense);
    
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
    
    await deleteCashTransactionBySourceId(expense._id);
    
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
  deleteExpense
};
