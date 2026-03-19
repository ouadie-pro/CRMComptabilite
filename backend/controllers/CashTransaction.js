const CashTransaction = require('../models/CashTransactionSchema');
const Payment = require('../models/PaymentSchema');
const Expense = require('../models/ExpenseSchema');
const Invoice = require('../models/InvoiceSchema');
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
      if (endDate) query.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total] = await Promise.all([
      CashTransaction.find(query)
        .populate('userId', 'name email')
        .populate('linkedInvoiceId', 'number totalTTC clientId status')
        .populate('linkedExpenseId', 'description category amount date status')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CashTransaction.countDocuments(query)
    ]);

    const totals = await CashTransaction.aggregate([
      { $match: query },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);

    res.status(200).json({
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
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const transaction = await CashTransaction.findById(req.params.id)
      .populate('userId', 'name email')
      .populate('linkedInvoiceId', 'number totalTTC clientId status')
      .populate('linkedExpenseId', 'description category amount date status');
    
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
      userId: req.user?._id || req.body.userId,
      source: 'manual'
    });
    await transaction.save();
    
    const populated = await CashTransaction.findById(transaction._id)
      .populate('userId', 'name email');
    
    if (req.user?._id) {
      await logAudit({
        userId: req.user._id,
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
    const transaction = await CashTransaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.source !== 'manual') {
      return res.status(400).json({ 
        message: 'Cannot edit auto-generated transactions. Edit the source record instead.',
        transaction 
      });
    }

    Object.assign(transaction, req.body);
    await transaction.save();
    
    const populated = await CashTransaction.findById(transaction._id)
      .populate('userId', 'name email');
    
    if (req.user?._id) {
      await logAudit({
        userId: req.user._id,
        action: 'Update Cash Transaction',
        entity: 'CashTransaction',
        entityId: transaction._id,
        changes: req.body,
        req
      });
    }
    
    res.status(200).json({ message: 'Transaction updated successfully', transaction: populated });
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
    
    if (transaction.source !== 'manual') {
      return res.status(400).json({ 
        message: 'Cannot delete auto-generated transactions. Delete the source record instead.',
        transaction 
      });
    }
    
    await CashTransaction.findByIdAndDelete(req.params.id);
    
    if (req.user?._id) {
      await logAudit({
        userId: req.user._id,
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
      if (endDate) dateFilter.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const [cashTotals, bySource, recent, allPayments, allExpenses, linkedPaymentIds, linkedExpenseIds] = await Promise.all([
      CashTransaction.aggregate([
        { $match: { ...dateFilter, ...baseMatch } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      CashTransaction.aggregate([
        { $match: { ...dateFilter, ...baseMatch } },
        { $group: { 
          _id: '$source', 
          totalIn: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', 0] } }, 
          totalOut: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } },
          count: { $sum: 1 }
        }}
      ]),
      CashTransaction.find({ ...dateFilter, ...baseMatch })
        .populate('linkedInvoiceId', 'number totalTTC')
        .populate('linkedExpenseId', 'description')
        .sort({ date: -1 })
        .limit(5),
      Payment.find(),
      Expense.find({ status: { $ne: 'rejected' } }),
      CashTransaction.distinct('sourceId', { source: 'invoice' }),
      CashTransaction.distinct('sourceId', { source: 'expense' }),
    ]);

    const linkedPaymentIdStrings = linkedPaymentIds.map(id => id?.toString()).filter(Boolean);
    const linkedExpenseIdStrings = linkedExpenseIds.map(id => id?.toString()).filter(Boolean);

    let unlinkedPaymentsTotal = 0;
    let unlinkedPaymentsCount = 0;
    let unlinkedExpensesTotal = 0;
    let unlinkedExpensesCount = 0;

    allPayments.forEach(p => {
      if (!linkedPaymentIdStrings.includes(p._id.toString())) {
        const paymentDate = new Date(p.paidAt);
        const inDateRange = (!startDate || paymentDate >= new Date(startDate)) &&
                          (!endDate || paymentDate <= new Date(endDate + 'T23:59:59.999Z'));
        if (inDateRange) {
          unlinkedPaymentsTotal += p.amount;
          unlinkedPaymentsCount++;
        }
      }
    });

    allExpenses.forEach(e => {
      if (!linkedExpenseIdStrings.includes(e._id.toString())) {
        const expenseDate = new Date(e.date);
        const inDateRange = (!startDate || expenseDate >= new Date(startDate)) &&
                          (!endDate || expenseDate <= new Date(endDate + 'T23:59:59.999Z'));
        if (inDateRange) {
          unlinkedExpensesTotal += e.amount;
          unlinkedExpensesCount++;
        }
      }
    });

    const result = {
      balance: 0,
      totalIn: 0,
      totalOut: 0,
      totalManual: 0,
      netCashFlow: 0,
      countIn: 0,
      countOut: 0,
      unlinkedPayments: { count: unlinkedPaymentsCount, total: unlinkedPaymentsTotal },
      unlinkedExpenses: { count: unlinkedExpensesCount, total: unlinkedExpensesTotal },
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

    result.netCashFlow = result.totalIn - result.totalOut;

    bySource.forEach(s => {
      result.bySource[s._id || 'unknown'] = { 
        totalIn: s.totalIn, 
        totalOut: s.totalOut,
        count: s.count
      };
      if (s._id === 'manual') {
        result.totalManual = s.totalIn + s.totalOut;
      }
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
    const linkedPaymentIdStrings = linkedPaymentIds.map(id => id?.toString()).filter(Boolean);
    const linkedExpenseIdStrings = linkedExpenseIds.map(id => id?.toString()).filter(Boolean);

    const allPayments = await Payment.find();
    const allExpenses = await Expense.find({ status: { $ne: 'rejected' } });

    const missingPayments = allPayments.filter(p => !linkedPaymentIdStrings.includes(p._id.toString()));
    const missingExpenses = allExpenses.filter(e => !linkedExpenseIdStrings.includes(e._id.toString()));

    const paymentTransactions = await Promise.all(missingPayments.map(async (payment) => {
      const invoice = await Invoice.findById(payment.invoiceId).populate('clientId', 'companyName');
      return CashTransaction.createFromPayment(payment, invoice, req.user?._id);
    }));

    const expenseTransactions = await Promise.all(missingExpenses.map(async (expense) => {
      return CashTransaction.createFromExpense(expense, req.user?._id);
    }));

    await logAudit({
      userId: req.user?._id,
      action: 'Reconcile Cash Transactions',
      entity: 'CashTransaction',
      entityId: null,
      changes: { 
        createdForPayments: paymentTransactions.length, 
        createdForExpenses: expenseTransactions.length,
        totalPaymentAmount: paymentTransactions.reduce((sum, t) => sum + (t?.amount || 0), 0),
        totalExpenseAmount: expenseTransactions.reduce((sum, t) => sum + (t?.amount || 0), 0)
      },
      req
    });

    res.status(200).json({
      message: 'Reconciliation complete',
      createdForPayments: paymentTransactions.length,
      createdForExpenses: expenseTransactions.length,
      totalPaymentAmount: paymentTransactions.reduce((sum, t) => sum + (t?.amount || 0), 0),
      totalExpenseAmount: expenseTransactions.reduce((sum, t) => sum + (t?.amount || 0), 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getChartData = async (req, res) => {
  try {
    const { period = 'daily', months = 6 } = req.query;
    const now = new Date();
    let startDate;
    
    if (period === 'daily') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - parseInt(months) * 30 * 24 * 60 * 60 * 1000);
    }

    const chartData = await CashTransaction.aggregate([
      { $match: { date: { $gte: startDate }, status: { $ne: 'rejected' } } },
      {
        $group: {
          _id: period === 'daily' 
            ? { $dateToString: { format: '%Y-%m-%d', date: '$date' } }
            : { $dateToString: { format: '%Y-%m', date: '$date' } },
          income: { $sum: { $cond: [{ $eq: ['$type', 'in'] }, '$amount', 0] } },
          expenses: { $sum: { $cond: [{ $eq: ['$type', 'out'] }, '$amount', 0] } },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 1,
          income: 1,
          expenses: 1,
          net: { $subtract: ['$income', '$expenses'] },
          count: 1
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ data: chartData });
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
  reconcileTransactions,
  getChartData
};
