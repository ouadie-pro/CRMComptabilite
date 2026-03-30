const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({

  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: true
  },

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  method: {
    type: String,
    enum: ["virement", "cash", "cheque", "carte", "traite", "especes", "autre"],
    required: true
  },

  paidAt: {
    type: Date,
    required: true
  },

  reference: {
    type: String 
  },

  notes: {
    type: String 
  }

}, { timestamps: true });

paymentSchema.statics.aggregateWithPagination = async function(filter = {}) {
  const linkedPayments = await CashTransaction.distinct('sourceId', { source: 'invoice' });
  const linkedIds = linkedPayments.map(id => id?.toString()).filter(Boolean);

  const allMatching = await this.find(filter);
  const unlinkedPayments = allMatching.filter(p => !linkedIds.includes(p._id.toString()));

  return {
    count: unlinkedPayments.length,
    total: unlinkedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  };
};

const CashTransaction = require('./CashTransactionSchema');
module.exports = mongoose.model("Payment", paymentSchema);