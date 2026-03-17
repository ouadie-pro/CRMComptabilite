const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder
} = require('../controllers/Reminder');

Router.use(authMiddleware);

Router.get('/', getAllReminders);
Router.get('/:id', getReminderById);
Router.post('/', createReminder);
Router.put('/:id', updateReminder);
Router.delete('/:id', deleteReminder);

module.exports = Router;
