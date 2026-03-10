const express = require('express');
const Router = express.Router();
const {
  getAllInteractions,
  getInteractionById,
  createInteraction,
  updateInteraction,
  deleteInteraction
} = require('../controllers/Interaction');

Router.get('/', getAllInteractions);
Router.get('/:id', getInteractionById);
Router.post('/', createInteraction);
Router.put('/:id', updateInteraction);
Router.delete('/:id', deleteInteraction);

module.exports = Router;
