const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ["salaire", "loyer", "services", "fournitures", "transport", "autre"],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  vendor: {
    type: String
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'virement', 'cheque', 'carte', 'traite', 'autre'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  notes: {
    type: String
  },
  attachmentUrl: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

expenseSchema.statics.aggregateWithPagination = async function(filter = {}) {
  const linkedExpenses = await CashTransaction.distinct('sourceId', { source: 'expense' });
  const linkedIds = linkedExpenses.map(id => id?.toString()).filter(Boolean);

  const allMatching = await this.find(filter);
  const unlinkedExpenses = allMatching.filter(e => !linkedIds.includes(e._id.toString()));

  return {
    count: unlinkedExpenses.length,
    total: unlinkedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  };
};

const CashTransaction = require('./CashTransactionSchema');
module.exports = mongoose.model("Expense", expenseSchema);
