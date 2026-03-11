const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('./models/userSchema');

const seedUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/crm_comptabilite');
    
    const existingUser = await User.findOne({ email: 'admin@crm.fr' });
    
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const user = new User({
        name: 'Admin',
        email: 'admin@crm.fr',
        password: hashedPassword,
        role: 'admin'
      });
      await user.save();
      console.log('User created: admin@crm.fr / admin123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedUser();
