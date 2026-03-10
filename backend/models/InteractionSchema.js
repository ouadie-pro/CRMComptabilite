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
    enum: ["call", "email", "meeting", "note"],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  nextAction: {
    type: String
  },
  nextActionDate: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model("Interaction", interactionSchema);
