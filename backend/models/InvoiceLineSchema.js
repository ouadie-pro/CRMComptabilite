const mongoose = require("mongoose");

const invoiceLineSchema = new mongoose.Schema({

  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: false
  },

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
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

module.exports = mongoose.model("InvoiceLine", invoiceLineSchema);