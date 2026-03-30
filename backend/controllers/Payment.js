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

    console.log('[Payment] getAllPayments - raw query params:', { clientId, invoiceId, method });

    if (clientId) {
      query.clientId = clientId;
    }
    if (invoiceId) {
      query.invoiceId = invoiceId;
      console.log('[Payment] Querying by invoiceId:', invoiceId);
    }
    if (method) query.method = method;

    console.log('[Payment] getAllPayments - built query:', query);

    // First, let's check ALL payments exist
    const allPaymentsCount = await Payment.countDocuments();
    console.log('[Payment] Total payments in DB:', allPaymentsCount);

    const payments = await Payment.find(query)
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC')
      .sort({ paidAt: -1 });
    console.log('[Payment] Found payments matching query:', payments.length);
    
    if (payments.length > 0) {
      payments.forEach((p, i) => {
        console.log(`[Payment] Payment ${i+1}: _id=${p._id}, invoiceId=${p.invoiceId?._id || p.invoiceId}, amount=${p.amount}`);
      });
    }
    
    res.status(200).json(payments);
  } catch (error) {
    console.error('[Payment] getAllPayments error:', error);
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
    console.log('[Payment] createPayment - req.body:', JSON.stringify(req.body, null, 2));
    
    const payment = new Payment(req.body);
    console.log('[Payment] payment before save:', payment);
    
    await payment.save();
    console.log('[Payment] payment saved successfully, _id:', payment._id);
    
    const populatedPayment = await Payment.findById(payment._id)
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC clientId');
    console.log('[Payment] populatedPayment:', populatedPayment);
    
    const updatedInvoice = await updateInvoicePaymentTotals(payment.invoiceId);
    console.log('[Payment] invoice totals updated:', updatedInvoice);
    
    const invoice = await Invoice.findById(payment.invoiceId).populate('clientId', 'companyName');
    const userId = req.user?._id || req.user?.id || null;
    console.log('[Payment] creating CashTransaction with userId:', userId);
    
    try {
      const cashTx = await CashTransaction.createFromPayment(populatedPayment, invoice, userId);
      console.log('[Payment] CashTransaction created:', cashTx._id);
    } catch (cashErr) {
      console.error('[Payment] CashTransaction error (non-fatal):', cashErr.message);
    }
    
    res.status(201).json({ 
      message: 'Payment created successfully', 
      payment: populatedPayment,
      invoice: invoice
    });
  } catch (error) {
    console.error('[Payment] createPayment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
  }
};

const updatePayment = async (req, res) => {
  try {
    const existingPayment = await Payment.findById(req.params.id);
    if (!existingPayment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const amountChanged = existingPayment.amount !== req.body.amount;

    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC clientId');
    
    await updateInvoicePaymentTotals(payment.invoiceId);
    
    if (amountChanged) {
      const invoice = await Invoice.findById(payment.invoiceId).populate('clientId', 'companyName');
      const userId = req.user?._id || req.user?.id || null;
      await CashTransaction.createFromPayment(payment, invoice, userId);
    }
    
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
