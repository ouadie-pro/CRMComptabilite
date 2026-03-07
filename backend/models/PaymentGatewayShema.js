const mongoose = require("mongoose");

const paymentGatewaySchema = new mongoose.Schema({

  name: {
    type: String,
    enum: ["stripe", "paypal"],
    required: true
  },

  status: {
    type: String,
    enum: ["connecté", "inactif"],
    default: "inactif"
  },

  config: {
    type: mongoose.Schema.Types.Mixed, 
    required: true
  }

}, { timestamps: true });

module.exports = mongoose.model("PaymentGateway", paymentGatewaySchema);