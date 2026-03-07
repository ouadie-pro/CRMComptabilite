const express = require('express');
const Router = express.Router();
const { postCompany , getCompany } = require('../controllers/Company');

Router.post('/',postCompany);
Router.get('/',getCompany);

module.exports = Router;