const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    cmopanyName : {
        type:String,
        required:true,
    },
    contactName : {
        type: String,
        required: true,
    },
    contactTitle : {
        type: String,
        required: true,
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
        required: true,
    },
    ice : {
        type: String,
        required: true,
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