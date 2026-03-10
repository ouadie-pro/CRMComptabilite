const express = require('express');
const Router = express.Router();
const {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
} = require('../controllers/Client');

Router.get('/', getAllClients);
Router.get('/:id', getClientById);
Router.post('/', createClient);
Router.put('/:id', updateClient);
Router.delete('/:id', deleteClient);

module.exports = Router;
