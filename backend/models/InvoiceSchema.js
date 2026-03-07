const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({

  number: {
    type: String,
    required: true,
    unique: true 
  },

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  lines: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "InvoiceLine"
  }],

  paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null
  },
  
  status: {
    type: String,
    enum: ["brouillon", "envoyé", "payé", "en_retard", "annulé"],
    default: "brouillon"
  },

  issueDate: {
    type: Date,
    required: true
  },

  dueDate: {
    type: Date,
    required: true
  },

  notes: {
    type: String
  },

  subtotalHT: {
    type: Number,
    required: true
  },

  totalDiscount: {
    type: Number,
    default: 0
  },

  totalVat: {
    type: Number,
    default: 0
  },

  totalTTC: {
    type: Number,
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);