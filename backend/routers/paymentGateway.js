const express = require('express');
const Router = express.Router();
const {
  getAllPaymentGateways,
  getPaymentGatewayById,
  createPaymentGateway,
  updatePaymentGateway,
  deletePaymentGateway
} = require('../controllers/PaymentGateway');

Router.get('/', getAllPaymentGateways);
Router.get('/:id', getPaymentGatewayById);
Router.post('/', createPaymentGateway);
Router.put('/:id', updatePaymentGateway);
Router.delete('/:id', deletePaymentGateway);

module.exports = Router;
