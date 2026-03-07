const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({

  sku: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    required: true
  },

  category: {
    type: String,
    enum: ["matériel", "service", "licence"],
    required: true
  },

  priceHT: {
    type: Number,
    required: true
  },

  vatRate: {
    type: Number,
    default: 20
  },

  status: {
    type: String,
    enum: ["actif", "inactif"],
    default: "actif"
  }

}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);