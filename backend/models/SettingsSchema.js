const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  company: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    ice: { type: String, default: '' },
    rc: { type: String, default: '' },
    if: { type: String, default: '' },
    phone: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
  },
  billing: {
    currency: { type: String, default: 'MAD' },
    vatRate: { type: Number, default: 20 },
    invoiceFormat: { type: String, default: 'F-{YYYY}-{0000}' },
  },
  notifications: {
    firstReminder: { type: Number, default: 3 },
    secondReminder: { type: Number, default: 7 },
    smtpHost: { type: String, default: '' },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
