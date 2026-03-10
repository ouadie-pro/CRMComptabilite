const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    name: {
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    role:{
        type:String,
        enum:["admin", "directeur", "comptable"],
        required:true,
        default:"comptable",
    },
    avatarUrl:{
        type:String,
        default:"",
    },
    createdAt:{
        type:Date,
        default:Date.now,
    },
    lastLogin:{
        type:Date,
        default:Date.now,
    },
});
module.exports = mongoose.model('User', userSchema);
