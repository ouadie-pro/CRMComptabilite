const User = require('../models/userSchema');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const registerUser = async (req,res)=>{
    const {name,email,password,role = "comptable"} = req.body;

    if(!name || !email || !password){
        return res.status(400).json({message:"All fields are required"});
    }

    let user = await User.findOne({email});

    if(user){
        return res.status(400).json({message:'User alredy exciste'});
    }

    const hashedPassword = await bcrypt.hash(password,10);

    const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role
    })

    await newUser.save();
    
    let token = jwt.sign({email,id:newUser._id},process.env.SECRET_KEY,{expiresIn:'7h'})
    return res.status(201).json({message:'User registered successfully',token,user:newUser})

}


const loginUser = async (req,res)=>{
    const {email,password} = req.body

    if(!email || !password){
        res.status(400).json({message:"Eamil and password are require "})
    }

    let user = await User.findOne({email});

    if(user && await bcrypt.compare(password,user.password)){
        let token = jwt.sign({email,id:user._id},process.env.SECRET_KEY,{expiresIn:'7h'})
        return res.status(201).json({message:'User registered successfully',token,user})
    }else{
        return res.status(201).json({message : 'invalide email or password'})
    }
}

const getUser = async(req,res)=>{
    const users = await User.find()
    res.json(users)
}



const getIDUser = async(req,res)=>{
    const user = await User.findById(req.params.id)
    if(!user){
        return res.status(404).json({message: "User not found"})
    }
    res.status(202).json({user})
}

const updateUser = async(req,res)=>{
    const user = await User.findByIdAndUpdate(req.params.id,req.body,{new:true})
    res.json(user)
}

const deletUser = async(req,res)=>{
    const user = await User.findByIdAndDelete(req.params.id)
    res.json(user)
}

module.exports = {registerUser , loginUser , getIDUser , deletUser , getUser ,updateUser}