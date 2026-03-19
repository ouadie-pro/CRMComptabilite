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
  }
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
