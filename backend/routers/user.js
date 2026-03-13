const express = require('express');
const Router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getAllUsers,
  getUserById,
  updateUser,
  changePassword,
  deleteUser,
  authMiddleware
} = require('../controllers/User');

Router.post('/register', registerUser);
Router.post('/login', loginUser);
Router.post('/logout', authMiddleware, logoutUser);

Router.use(authMiddleware);

Router.get('/', getAllUsers);
Router.get('/:id', getUserById);
Router.put('/:id', updateUser);
Router.put('/:id/password', changePassword);
Router.delete('/:id', deleteUser);

module.exports = Router;
