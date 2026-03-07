const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({

  category: {
    type: String,
    enum: ["salaires", "loyer", "marketing", "logiciels", "logistique", "divers"],
    required: true
  },

  description: {
    type: String
  },

  amount: {
    type: Number,
    required: true
  },

  vatRate: {
    type: Number,
    default: 0
  },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  },

  date: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["payé", "en_attente"],
    default: "en_attente"
  }

}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);