const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: false,
    default: null
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unitPriceHT: {
    type: Number,
    required: true
  },
  vatRate: {
    type: Number,
    default: 20
  },
  discount: {
    type: Number,
    default: 0
  },
  totalHT: {
    type: Number,
    required: true
  }
}, { timestamps: true });

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

  items: [invoiceItemSchema],

  paymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Payment",
        default: null
  },
  
  status: {
    type: String,
    enum: ["brouillon", "envoyé", "partiellement payé", "payé", "en_retard", "annulé"],
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
  },

  totalPaid: {
    type: Number,
    default: 0
  },

  remainingAmount: {
    type: Number,
    default: function() { return this.totalTTC; }
  }

}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);