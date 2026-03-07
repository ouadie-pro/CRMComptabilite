const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  title: {
    type: String,
    required: true
  },

  dueAt: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ["pending", "done", "overdue"],
    default: "pending"
  },

  type: {
    type: String,
    enum: ["devis", "facture", "autre"],
    default: "autre"
  }

}, { timestamps: true });

module.exports = mongoose.model("Reminder", reminderSchema);