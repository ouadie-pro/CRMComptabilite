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
  authMiddleware,
  requireRole,
  forgotPassword,
  resetPassword,
  adminResetPassword
} = require('../controllers/User');

Router.post('/register', registerUser);
Router.post('/login', loginUser);
Router.post('/logout', authMiddleware, logoutUser);
Router.post('/forgot-password', forgotPassword);
Router.post('/reset-password', resetPassword);
Router.post('/admin-reset-password', authMiddleware, requireRole('admin'), adminResetPassword);

Router.use(authMiddleware);

Router.get('/', requireRole('admin'), getAllUsers);
Router.get('/:id', getUserById);
Router.put('/:id', updateUser);
Router.put('/:id/password', changePassword);
Router.delete('/:id', requireRole('admin'), deleteUser);

module.exports = Router;
