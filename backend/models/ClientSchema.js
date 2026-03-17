const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    contactName : {
        type: String,
        default: 'Client',
    },
    contactTitle : {
        type: String,
        default: 'Client',
    },
    email : {
        type: String,
        required: true,
        unique: true,
    },
    phone: {
    type: String
    },
    address : {
    type: String,
    },
    city: {
    type: String
    },
    country: {
    type: String
    },
    ice : {
        type: String,
    },
    status: {
        type: String,
        enum: ["actif", "nouveau", "en_retard", "archivé"],
        default: "nouveau"
    },
    totalBilled : {
        type: Number,
        default: 0
    },
    createdAt : {
        type: Date,
        default: Date.now
    },

},{ timestamps: true });
module.exports = mongoose.model('Client',clientSchema)