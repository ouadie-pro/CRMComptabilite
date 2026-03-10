const InvoiceLine = require('../models/InvoiceLineSchema');

const getAllInvoiceLines = async (req, res) => {
  try {
    const { invoiceId } = req.query;
    let query = {};
    if (invoiceId) query.invoiceId = invoiceId;

    const lines = await InvoiceLine.find(query).sort({ createdAt: -1 });
    res.status(200).json(lines);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInvoiceLineById = async (req, res) => {
  try {
    const line = await InvoiceLine.findById(req.params.id).populate('productId');
    if (!line) {
      return res.status(404).json({ message: 'Invoice line not found' });
    }
    res.status(200).json(line);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createInvoiceLine = async (req, res) => {
  try {
    const line = new InvoiceLine(req.body);
    await line.save();
    res.status(201).json({ message: 'Invoice line created successfully', line });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateInvoiceLine = async (req, res) => {
  try {
    const line = await InvoiceLine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('productId');
    if (!line) {
      return res.status(404).json({ message: 'Invoice line not found' });
    }
    res.status(200).json({ message: 'Invoice line updated successfully', line });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteInvoiceLine = async (req, res) => {
  try {
    const line = await InvoiceLine.findByIdAndDelete(req.params.id);
    if (!line) {
      return res.status(404).json({ message: 'Invoice line not found' });
    }
    res.status(200).json({ message: 'Invoice line deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllInvoiceLines,
  getInvoiceLineById,
  createInvoiceLine,
  updateInvoiceLine,
  deleteInvoiceLine
};
