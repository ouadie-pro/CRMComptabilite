const mongoose = require("mongoose");

const interactionSchema = new mongoose.Schema({

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

  type: {
    type: String,
    enum: ["appel", "email", "devis", "paiement", "note"],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  linkedDocumentId: {
    type: mongoose.Schema.Types.ObjectId
  },

  linkedDocumentType: {
    type: String 
  },

  occurredAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true });

module.exports = mongoose.model("Interaction", interactionSchema);