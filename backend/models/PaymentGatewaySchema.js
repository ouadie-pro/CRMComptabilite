const mongoose = require("mongoose");

const paymentGatewaySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ["stripe", "paypal", " Mollie", "other"],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  apiKey: {
    type: String
  },
  apiSecret: {
    type: String
  },
  webhookUrl: {
    type: String
  },
  configuration: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

module.exports = mongoose.model("PaymentGateway", paymentGatewaySchema);
