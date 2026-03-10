const express = require('express');
const Router = express.Router();
const {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} = require('../controllers/Company');

Router.get('/', getAllCompanies);
Router.get('/:id', getCompanyById);
Router.post('/', createCompany);
Router.put('/:id', updateCompany);
Router.delete('/:id', deleteCompany);

module.exports = Router;
