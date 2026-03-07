const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  category: {
    type: String,
    enum: ["facturation", "client", "sécurité", "config", "erreur_système"],
    required: true
  },

  action: {
    type: String,
    required: true 
  },

  before: {
    type: mongoose.Schema.Types.Mixed 
  },

  after: {
    type: mongoose.Schema.Types.Mixed 
  },

  ipAddress: {
    type: String
  },

  occurredAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);