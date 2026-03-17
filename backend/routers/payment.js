const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
} = require('../controllers/Payment');

Router.use(authMiddleware);

Router.get('/', getAllPayments);
Router.get('/:id', getPaymentById);
Router.post('/', createPayment);
Router.put('/:id', updatePayment);
Router.delete('/:id', deletePayment);

module.exports = Router;
