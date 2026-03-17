const express = require('express');
const Router = express.Router();
const { authMiddleware } = require('../controllers/User');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/Product');

Router.use(authMiddleware);

Router.get('/', getAllProducts);
Router.get('/:id', getProductById);
Router.post('/', createProduct);
Router.put('/:id', updateProduct);
Router.delete('/:id', deleteProduct);

module.exports = Router;
