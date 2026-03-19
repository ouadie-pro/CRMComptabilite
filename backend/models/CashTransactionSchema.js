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
  source: {
    type: String,
    enum: ['invoice', 'expense', 'manual', 'refund', 'adjustment'],
    default: 'manual'
  },
  reference: {
    type: String
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false,
    index: true
  },
  category: {
    type: String,
    enum: ['sale', 'service', 'deposit', 'withdrawal', 'supply', 'salary', 'rent', 'utility', 'transport', 'other'],
    default: 'other'
  },
  linkedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  linkedExpenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['confirmed', 'pending', 'rejected'],
    default: 'confirmed'
  }
}, { timestamps: true });

cashTransactionSchema.index({ date: -1 });
cashTransactionSchema.index({ type: 1 });
cashTransactionSchema.index({ source: 1 });
cashTransactionSchema.index({ sourceId: 1 });
cashTransactionSchema.index({ reference: 1 });

module.exports = mongoose.model("CashTransaction", cashTransactionSchema);
