const CashTransaction = require('../models/CashTransactionSchema');
const Payment = require('../models/PaymentSchema');
const Expense = require('../models/ExpenseSchema');
const logAudit = require('../utils/auditLogger');

const getAllTransactions = async (req, res) => {
  try {
    const { type, source, method, startDate, endDate, category, status, limit = 100, page = 1 } = req.query;
    let query = {};

    if (type) query.type = type;
    if (source) query.source = source;
    if (method) query.method = method;
    if (category) query.category = category;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      CashTransaction.find(query)
        .populate('userId', 'name email')
        .populate('linkedInvoiceId', 'number totalTTC clientId status')
        .populate('linkedExpenseId', 'number description category amount date')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CashTransaction.countDocuments(query)
    ]);

    const totals = await CashTransaction.aggregate([
      { $match: query },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    const result = {
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      },
      totals: {
        in: totals.find(t => t._id === 'in')?.total || 0,
        out: totals.find(t => t._id === 'out')?.total || 0
      }
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await CashTransaction.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('linkedInvoiceId', 'number totalTTC clientId status')
      .populate('linkedExpenseId', 'number description category amount date');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createTransaction = async (req, res) => {
  try {
    const transaction = new CashTransaction({
      ...req.body,
      userId: req.user?.id || req.user?._id || req.body.userId,
      source: req.body.source || 'manual'
    });
    await transaction.save();
    
    const populated = await CashTransaction.findById(transaction._id)
      .populate('userId', 'name email')
      .populate('linkedInvoiceId', 'number totalTTC')
      .populate('linkedExpenseId', 'number description');
    
    if (req.user?.id || req.user?._id) {
      await logAudit({
        userId: req.user.id || req.user._id,
        action: 'Create Cash Transaction',
        entity: 'CashTransaction',
        entityId: transaction._id,
        changes: req.body,
        req
      });
    }
    
    res.status(201).json({ message: 'Transaction created successfully', transaction: populated });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const transaction = await CashTransaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('linkedInvoiceId', 'number totalTTC')
      .populate('linkedExpenseId', 'number description');
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (req.user?.id || req.user?._id) {
      await logAudit({
        userId: req.user.id || req.user._id,
        action: 'Update Cash Transaction',
        entity: 'CashTransaction',
        entityId: transaction._id,
        changes: req.body,
        req
      });
    }
    
    res.status(200).json({ message: 'Transaction updated successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const transaction = await CashTransaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.source === 'invoice' || transaction.source === 'expense') {
      return res.status(400).json({ 
        message: 'Cannot delete auto-generated transactions. Delete the source record instead.',
        transaction 
      });
    }
    
    await CashTransaction.findByIdAndDelete(req.params.id);
    
    if (req.user?.id || req.user?._id) {
      await logAudit({
        userId: req.user.id || req.user._id,
        action: 'Delete Cash Transaction',
        entity: 'CashTransaction',
        entityId: req.params.id,
        changes: transaction,
        req
      });
    }
    
    res.status(200).json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let dateFilter = {};
    const baseMatch = { status: { $ne: 'rejected' } };

    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    const [cashTotals, byMethod, byCategory, bySource, recent, allPayments, allExpenses, linkedPaymentIds, linkedExpenseIds] = await Promise.all([
      CashTransaction.aggregate([
        { $match: { ...dateFilter, ...baseMatch } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      CashTransaction.aggregate([
        { $match: { ...dateFilter, ...baseMatch, type: 'in' } },
        { $group: { _id: '$method', total: { $sum: '$amount' } } }
      ]),
      CashTransaction.aggregate([
        { $match: { ...dateFilter, ...baseMatch, type: 'out' } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      CashTransaction.aggregate([
        { $match: { ...dateFilter, ...baseMatch } },
        { $group: { _id: '$source', totalIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', 0] } }, totalOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } } } }
      ]),
      CashTransaction.find({ ...dateFilter, ...baseMatch })
        .populate('linkedInvoiceId', 'number totalTTC')
        .populate('linkedExpenseId', 'number description')
        .sort({ date: -1 })
        .limit(10),
      Payment.find(),
      Expense.find(),
      CashTransaction.distinct('sourceId', { source: 'invoice' }),
      CashTransaction.distinct('sourceId', { source: 'expense' }),
    ]);

    const linkedPaymentIdStrings = linkedPaymentIds.map(id => id?.toString());
    const linkedExpenseIdStrings = linkedExpenseIds.map(id => id?.toString());

    let orphanedPaymentsTotal = 0;
    let orphanedPaymentsCount = 0;
    let orphanedExpensesTotal = 0;
    let orphanedExpensesCount = 0;

    allPayments.forEach(p => {
      if (!linkedPaymentIdStrings.includes(p._id.toString())) {
        const paymentDate = new Date(p.paidAt);
        const inDateRange = (!startDate || paymentDate >= new Date(startDate)) &&
                          (!endDate || paymentDate <= new Date(endDate));
        if (inDateRange) {
          orphanedPaymentsTotal += p.amount;
          orphanedPaymentsCount++;
        }
      }
    });

    allExpenses.forEach(e => {
      if (!linkedExpenseIdStrings.includes(e._id.toString()) && e.status !== 'rejected') {
        const expenseDate = new Date(e.date);
        const inDateRange = (!startDate || expenseDate >= new Date(startDate)) &&
                          (!endDate || expenseDate <= new Date(endDate));
        if (inDateRange) {
          orphanedExpensesTotal += e.amount;
          orphanedExpensesCount++;
        }
      }
    });

    const result = {
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      countIn: 0,
      countOut: 0,
      orphanedPayments: {
        count: orphanedPaymentsCount,
        total: orphanedPaymentsTotal
      },
      orphanedExpenses: {
        count: orphanedExpensesCount,
        total: orphanedExpensesTotal
      },
      byMethod: {},
      byCategory: {},
      bySource: {},
      recent
    };

    cashTotals.forEach(t => {
      if (t._id === 'in') {
        result.totalIn = t.total;
        result.countIn = t.count;
        result.balance += t.total;
      } else if (t._id === 'out') {
        result.totalOut = t.total;
        result.countOut = t.count;
        result.balance -= t.total;
      }
    });

    result.totalIn += orphanedPaymentsTotal;
    result.totalOut += orphanedExpensesTotal;
    result.balance = result.totalIn - result.totalOut;

    byMethod.forEach(m => {
      result.byMethod[m._id || 'unknown'] = m.total;
    });

    byCategory.forEach(c => {
      result.byCategory[c._id || 'other'] = { total: c.total, count: c.count };
    });

    bySource.forEach(s => {
      result.bySource[s._id || 'unknown'] = { totalIn: s.totalIn, totalOut: s.totalOut };
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const reconcileTransactions = async (req, res) => {
  try {
    const linkedPaymentIds = await CashTransaction.distinct('sourceId', { source: 'invoice' });
    const linkedExpenseIds = await CashTransaction.distinct('sourceId', { source: 'expense' });
    const linkedPaymentIdStrings = linkedPaymentIds.map(id => id?.toString());
    const linkedExpenseIdStrings = linkedExpenseIds.map(id => id?.toString());

    const allPayments = await Payment.find();
    const allExpenses = await Expense.find({ status: { $ne: 'rejected' } });

    const missingPayments = allPayments.filter(p => !linkedPaymentIdStrings.includes(p._id.toString()));
    const missingExpenses = allExpenses.filter(e => !linkedExpenseIdStrings.includes(e._id.toString()));

    const paymentTransactions = await Promise.all(missingPayments.map(async (payment) => {
      const transaction = new CashTransaction({
        type: 'in',
        amount: payment.amount,
        method: payment.method,
        date: payment.paidAt,
        description: `Paiement ${payment.reference || ''}`.trim(),
        source: 'invoice',
        sourceId: payment._id,
        reference: payment.reference,
        linkedInvoiceId: payment.invoiceId,
        category: 'sale',
        status: 'confirmed',
        userId: payment.userId
      });
      await transaction.save();
      return transaction;
    }));

    const expenseTransactions = await Promise.all(missingExpenses.map(async (expense) => {
      const statusLabel = expense.status === 'approved' ? 'Approuvé' : expense.status === 'pending' ? 'En attente' : expense.status;
      const description = expense.vendor 
        ? `${expense.description} - ${expense.vendor} [${statusLabel}]`
        : `${expense.description} [${statusLabel}]`;
      
      const categoryMap = {
        'salaire': 'salary', 'loyer': 'rent', 'services': 'service',
        'fournitures': 'supply', 'transport': 'transport', 'autre': 'other',
        'salary': 'salary', 'rent': 'rent', 'service': 'service',
        'supply': 'supply', 'utility': 'utility', 'deposit': 'deposit', 'withdrawal': 'withdrawal'
      };
      
      const transaction = new CashTransaction({
        type: 'out',
        amount: expense.amount,
        method: expense.paymentMethod || 'cash',
        date: expense.date,
        description,
        source: 'expense',
        sourceId: expense._id,
        reference: `EXP-${expense._id}`,
        linkedExpenseId: expense._id,
        category: categoryMap[expense.category] || 'other',
        status: expense.status === 'approved' ? 'confirmed' : expense.status === 'pending' ? 'pending' : 'rejected',
        userId: expense.userId
      });
      await transaction.save();
      return transaction;
    }));

    await logAudit({
      userId: req.user?._id,
      action: 'Reconcile Cash Transactions',
      entity: 'CashTransaction',
      entityId: null,
      changes: { 
        createdForPayments: paymentTransactions.length, 
        createdForExpenses: expenseTransactions.length,
        totalPaymentAmount: paymentTransactions.reduce((sum, t) => sum + t.amount, 0),
        totalExpenseAmount: expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
      },
      req
    });

    res.status(200).json({
      message: 'Reconciliation complete',
      createdForPayments: paymentTransactions.length,
      createdForExpenses: expenseTransactions.length,
      totalPaymentAmount: paymentTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalExpenseAmount: expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  reconcileTransactions
};
