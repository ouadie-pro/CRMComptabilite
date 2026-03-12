const Invoice = require('../models/InvoiceSchema');

const getAllInvoices = async (req, res) => {
  try {
    const { status, clientId, startDate, endDate } = req.query;
    let query = {};

    if (status) query.status = status;
    if (clientId) query.clientId = clientId;
    
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'companyName email')
      .populate('lines')
      .sort({ createdAt: -1 });
    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('clientId', 'companyName email phone address ice')
      .populate('lines')
      .populate('paymentId');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createInvoice = async (req, res) => {
  try {
    console.log('Invoice data received:', JSON.stringify(req.body));
    const { client, invoiceNumber, date, dueDate, status, lines = [], ...rest } = req.body;
    
    if (!client) {
      return res.status(400).json({ message: 'Client is required' });
    }
    
    if (lines.length === 0) {
      return res.status(400).json({ message: 'At least one line is required' });
    }
    
    const statusMap = { draft: 'brouillon', sent: 'envoyé', paid: 'payé', overdue: 'en_retard', cancelled: 'annulé' };
    
    const InvoiceLine = require('../models/InvoiceLineSchema');
    const createdLines = await Promise.all(
      lines.map(line => 
        InvoiceLine.create({
          description: line.description || '',
          quantity: parseInt(line.quantity) || 1,
          unitPriceHT: parseFloat(line.price) || 0,
          vatRate: parseFloat(line.vatRate) || 20,
          discount: parseFloat(line.discount) || 0,
          totalHT: (parseInt(line.quantity) || 1) * (parseFloat(line.price) || 0) * (1 - (parseFloat(line.discount) || 0) / 100)
        })
      )
    );
    
    const subtotalHT = createdLines.reduce((sum, line) => sum + line.totalHT, 0);
    const totalVat = createdLines.reduce((sum, line) => sum + (line.totalHT * line.vatRate / 100), 0);
    const totalTTC = subtotalHT + totalVat;
    
    const invoiceData = {
      number: invoiceNumber || `FACT-${Date.now()}`,
      clientId: client,
      issueDate: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : (date ? new Date(date) : new Date()),
      status: statusMap[status] || status || 'brouillon',
      lines: createdLines.map(l => l._id),
      subtotalHT,
      totalVat,
      totalTTC,
      ...rest
    };
    
    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    await InvoiceLine.updateMany(
      { _id: { $in: createdLines.map(l => l._id) } },
      { invoiceId: invoice._id }
    );
    
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('clientId', 'companyName email')
      .populate('lines');
    res.status(201).json({ message: 'Invoice created successfully', invoice: populatedInvoice });
  } catch (error) {
    console.error('Invoice creation error:', error.message, error.errors);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`);
      return res.status(400).json({ message: 'Validation error', errors: validationErrors });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Invoice number already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'companyName email')
      .populate('lines');
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json({ message: 'Invoice updated successfully', invoice });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Invoice number already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.status(200).json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice
};
