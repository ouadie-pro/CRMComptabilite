const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders,
  getReminderStats,
  sendBatchReminders
} = require('../controllers/Reminder');

Router.use(authMiddleware);

Router.get('/', getAllReminders);
Router.get('/upcoming', getUpcomingReminders);
Router.get('/stats', getReminderStats);
Router.post('/send-batch', sendBatchReminders);
Router.get('/:id', getReminderById);
Router.post('/', createReminder);
Router.put('/:id', updateReminder);
Router.delete('/:id', deleteReminder);

module.exports = Router;
