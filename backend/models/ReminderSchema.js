const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Invoice",
    required: true
  },
  type: {
    type: String,
    enum: ["payment", "followup", "renewal"],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  sentDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending"
  },
  message: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model("Reminder", reminderSchema);
