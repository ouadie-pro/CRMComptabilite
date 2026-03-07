const express = require('express');
const Router = express.Router();
const {registerUser , loginUser , getIDUser , deletUser , getUser , updateUser} = require('../controllers/User');

Router.get('/',getUser);
Router.post('/register',registerUser);
Router.post('/signin',loginUser);
Router.get('/:id',getIDUser);
Router.put('/:id',updateUser);
Router.delete('/:id',deletUser);

module.exports = Router;