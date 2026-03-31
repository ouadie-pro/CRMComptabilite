const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['salaire', 'loyer', 'services', 'fournitures', 'transport', 'autre'],
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 0,
  },
  period: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly',
  },
  year: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Budget', budgetSchema);
