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
    enum: ["virement", "cache", "cheque", "trait", "carte", "paypal", "autre"],
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

module.exports = mongoose.model("Payment", paymentSchema);