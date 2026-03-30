const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/Notification');

Router.use(authMiddleware);

Router.get('/', getAllNotifications);
Router.get('/unread', getUnreadNotifications);
Router.put('/:id/read', markAsRead);
Router.put('/read-all', markAllAsRead);

module.exports = Router;
