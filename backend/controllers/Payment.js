const Payment = require('../models/PaymentSchema');
const Invoice = require('../models/InvoiceSchema');
const CashTransaction = require('../models/CashTransactionSchema');

const calculateInvoiceStatus = (totalPaid, totalTTC) => {
  if (totalPaid >= totalTTC) return 'payé';
  if (totalPaid > 0) return 'partiellement payé';
  return 'envoyé';
};

const updateInvoicePaymentTotals = async (invoiceId) => {
  const payments = await Payment.find({ invoiceId });
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) return null;
  
  const newStatus = calculateInvoiceStatus(totalPaid, invoice.totalTTC);
  invoice.totalPaid = totalPaid;
  invoice.remainingAmount = invoice.totalTTC - totalPaid;
  invoice.status = newStatus;
  invoice.updatedAt = new Date();
  await invoice.save();
  
  return { totalPaid, remainingAmount: invoice.remainingAmount, status: newStatus };
};

const getAllPayments = async (req, res) => {
  try {
    const { clientId, invoiceId, method } = req.query;
    let query = {};

    if (clientId) query.clientId = clientId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (method) query.method = method;

    const payments = await Payment.find(query)
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC')
      .sort({ paidAt: -1 });
    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('clientId', 'companyName email phone address')
      .populate('invoiceId', 'number totalTTC status');
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPayment = async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    const populatedPayment = await Payment.findById(payment._id)
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC clientId');
    
    await updateInvoicePaymentTotals(payment.invoiceId);
    const invoice = await Invoice.findById(payment.invoiceId).populate('clientId', 'companyName');
    await CashTransaction.createFromPayment(populatedPayment, invoice, req.user?._id);
    
    res.status(201).json({ 
      message: 'Payment created successfully', 
      payment: populatedPayment,
      invoice: invoice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updatePayment = async (req, res) => {
  try {
    const oldPayment = await Payment.findById(req.params.id);
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC clientId');
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    await updateInvoicePaymentTotals(payment.invoiceId);
    const invoice = await Invoice.findById(payment.invoiceId).populate('clientId', 'companyName');
    await CashTransaction.createFromPayment(payment, invoice, req.user?._id);
    
    res.status(200).json({ message: 'Payment updated successfully', payment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    await Payment.findByIdAndDelete(req.params.id);
    await CashTransaction.deleteBySourceId(payment._id);
    await updateInvoicePaymentTotals(payment.invoiceId);
    
    res.status(200).json({ message: 'Payment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment
};
