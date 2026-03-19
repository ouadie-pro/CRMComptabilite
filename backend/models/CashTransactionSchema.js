const mongoose = require("mongoose");

const cashTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['in', 'out'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  method: {
    type: String,
    enum: ['cash', 'virement', 'cheque', 'carte', 'traite', 'autre'],
    default: 'cash'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['sale', 'service', 'deposit', 'withdrawal', 'supply', 'salary', 'rent', 'utility', 'transport', 'refund', 'adjustment', 'other'],
    default: 'other'
  },
  source: {
    type: String,
    enum: ['invoice', 'expense', 'manual', 'refund'],
    required: true,
    default: 'manual'
  },
  reference: {
    type: String,
    trim: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    sparse: true,
    index: true
  },
  linkedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    sparse: true
  },
  linkedExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    sparse: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'rejected'],
    default: 'confirmed'
  }
}, { 
  timestamps: true 
});

cashTransactionSchema.index({ date: -1 });
cashTransactionSchema.index({ type: 1 });
cashTransactionSchema.index({ source: 1 });
cashTransactionSchema.index({ sourceId: 1 }, { sparse: true });
cashTransactionSchema.index({ linkedInvoiceId: 1 }, { sparse: true });
cashTransactionSchema.index({ linkedExpenseId: 1 }, { sparse: true });
cashTransactionSchema.index({ userId: 1 });

cashTransactionSchema.statics.findBySourceId = function(sourceId) {
  return this.findOne({ sourceId });
};

cashTransactionSchema.statics.createFromPayment = async function(payment, invoice, userId) {
  const existing = await this.findOne({ sourceId: payment._id });
  if (existing) {
    existing.amount = payment.amount;
    existing.method = this.schema.methods.mapPaymentMethod(payment.method);
    existing.date = payment.paidAt || new Date();
    existing.description = `Paiement facture #${invoice?.number || 'N/A'} - ${invoice?.clientId?.companyName || 'Client'}`;
    existing.status = 'confirmed';
    await existing.save();
    return existing;
  }

  const transaction = new this({
    type: 'in',
    amount: payment.amount,
    method: this.schema.methods.mapPaymentMethod(payment.method),
    date: payment.paidAt || new Date(),
    description: `Paiement facture #${invoice?.number || payment.invoiceId} - ${invoice?.clientId?.companyName || 'Client'}`,
    source: 'invoice',
    category: 'sale',
    sourceId: payment._id,
    reference: `PAY-${payment._id}`,
    linkedInvoiceId: payment.invoiceId,
    userId: userId || payment.clientId,
    status: 'confirmed'
  });
  await transaction.save();
  return transaction;
};

cashTransactionSchema.statics.createFromExpense = async function(expense, userId) {
  const statusLabel = expense.status === 'approved' ? 'Approuvé' : expense.status === 'pending' ? 'En attente' : expense.status;
  const description = expense.vendor 
    ? `${expense.description} - ${expense.vendor} [${statusLabel}]`
    : `${expense.description} [${statusLabel}]`;
  
  const categoryMap = {
    'salaire': 'salary', 'loyer': 'rent', 'services': 'service',
    'fournitures': 'supply', 'transport': 'transport', 'autre': 'other'
  };

  const existing = await this.findOne({ sourceId: expense._id });
  if (existing) {
    existing.amount = expense.amount;
    existing.method = expense.paymentMethod || 'cash';
    existing.date = expense.date || new Date();
    existing.description = description;
    existing.category = categoryMap[expense.category] || 'other';
    existing.status = expense.status === 'approved' ? 'confirmed' : expense.status === 'pending' ? 'pending' : 'rejected';
    await existing.save();
    return existing;
  }

  const transaction = new this({
    type: 'out',
    amount: expense.amount,
    method: expense.paymentMethod || 'cash',
    date: expense.date || new Date(),
    description: description,
    source: 'expense',
    category: categoryMap[expense.category] || 'other',
    sourceId: expense._id,
    reference: `EXP-${expense._id}`,
    linkedExpenseId: expense._id,
    userId: userId || expense.userId,
    status: expense.status === 'approved' ? 'confirmed' : expense.status === 'pending' ? 'pending' : 'rejected'
  });
  await transaction.save();
  return transaction;
};

cashTransactionSchema.statics.deleteBySourceId = async function(sourceId) {
  return this.findOneAndDelete({ sourceId });
};

cashTransactionSchema.methods.mapPaymentMethod = function(method) {
  const methodMap = {
    'cache': 'cash', 'trait': 'traite', 'virement': 'virement',
    'cheque': 'cheque', 'carte': 'carte'
  };
  return methodMap[method] || 'cash';
};

module.exports = mongoose.model("CashTransaction", cashTransactionSchema);
