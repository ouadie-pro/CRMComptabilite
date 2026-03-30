const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: {
        type:String,
        required:true,
    
    },
    address: {
        type:String,
        required:true,
    },
    ice :{
        type:String,
        required:true,
    },
    rc :{
        type:String,
        required:true,
    },
    if: {
        type: String,
        required:true,
    },
    phone :{
        type:String,
        required:true,
    },
    logoUrl: {
        type: String
    },
    currency: {
        type: String,
        enum: ["MAD"],
        default: "MAD"
    },
    defaultVatRate: {
        type: Number,
        default: 20
    },
    invoiceNumberFormat: {
        type: String,
        default: "F-{YYYY}-{0000}"
    },
    smtpServer: {
        type: String
    },
    paymentReminderDay1: {
        type: Number,
        default: 7
    },
    paymentReminderDay2: {
        type: Number,
        default: 15
    }
});
module.exports = mongoose.model('Company', companySchema);