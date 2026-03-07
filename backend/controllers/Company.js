const Conpany = require('../models/CompanySchema');

const postCompany = async (req, res) => {
    const company = new Conpany(req.body);
    try {
        const newCompany = await company.save();
        res.status(201).json(newCompany);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}
const getCompany = async (req, res) => {
    try {
        const company = await Conpany.find();
        res.status(200).json(company);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { postCompany, getCompany };