const Invoice = require('../models/InvoiceSchema');
const logAudit = require('../utils/auditLogger');

const generateInvoiceNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `FACT-${currentYear}-`;
  
  const lastInvoice = await Invoice.findOne({ number: { $regex: `^${prefix}\\d+$` } }).sort({ number: -1 });
  
  if (lastInvoice && lastInvoice.number) {
    const lastNumber = parseInt(lastInvoice.number.replace(prefix, ''));
    return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
  }
  
  return `${prefix}0001`;
};

const getAllInvoices = async (req, res) => {
  try {
    const { status, clientId, client, startDate, endDate } = req.query;
    let query = {};

    if (status) query.status = status;
    const clientFilter = clientId || client;
    if (clientFilter) query.clientId = clientFilter;
    
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'companyName email')
      .populate('items.productId')
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
      .populate('items.productId')
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
    
    let finalInvoiceNumber = invoiceNumber;
    
    if (!finalInvoiceNumber || finalInvoiceNumber.trim() === '') {
      finalInvoiceNumber = await generateInvoiceNumber();
    } else {
      const existingInvoice = await Invoice.findOne({ number: finalInvoiceNumber.trim() });
      if (existingInvoice) {
        return res.status(409).json({ message: 'Ce numéro de facture existe déjà. Veuillez utiliser un autre numéro ou laisser vide pour génération automatique.' });
      }
      finalInvoiceNumber = finalInvoiceNumber.trim();
    }
    
    const statusMap = { draft: 'brouillon', sent: 'envoyé', paid: 'payé', overdue: 'en_retard', cancelled: 'annulé' };
    
    const Product = require('../models/ProductSchema');
    const items = await Promise.all(
      lines.map(async (line) => {
        const quantity = parseInt(line.quantity) || 1;
        const unitPriceHT = parseFloat(line.price) || 0;
        const vatRate = parseFloat(line.vatRate) || 20;
        const discount = parseFloat(line.discount) || 0;
        
        let productName = line.name || line.description || 'Produit';
        let productId = null;
        
        if (line.productId) {
          const product = await Product.findById(line.productId);
          if (product) {
            productId = product._id;
            productName = product.name;
          }
        }
        
        return {
          productId,
          name: productName,
          description: line.description || '',
          quantity,
          unitPriceHT,
          vatRate,
          discount,
          totalHT: quantity * unitPriceHT * (1 - discount / 100)
        };
      })
    );
    
    const subtotalHT = items.reduce((sum, item) => sum + item.totalHT, 0);
    const totalVat = items.reduce((sum, item) => sum + (item.totalHT * item.vatRate / 100), 0);
    const totalTTC = subtotalHT + totalVat;
    
    const invoiceData = {
      number: finalInvoiceNumber,
      clientId: client,
      issueDate: date ? new Date(date) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : (date ? new Date(date) : new Date()),
      status: statusMap[status] || status || 'brouillon',
      items,
      subtotalHT,
      totalVat,
      totalTTC,
      ...rest
    };
    
    const invoice = new Invoice(invoiceData);
    await invoice.save();
    
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('clientId', 'companyName email')
      .populate('items.productId');
    await logAudit({
      userId: req.user?._id,
      action: "create",
      entity: "Invoice",
      entityId: invoice._id,
      changes: { number: invoice.number, clientId: invoice.clientId, totalTTC: invoice.totalTTC },
      req
    });
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
    const { clientId, number, date, dueDate, status, lines, notes } = req.body;
    
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (number !== undefined && number.trim() !== '') {
      const duplicateInvoice = await Invoice.findOne({ number: number.trim(), _id: { $ne: req.params.id } });
      if (duplicateInvoice) {
        return res.status(409).json({ message: 'Ce numéro de facture existe déjà. Veuillez utiliser un autre numéro.' });
      }
    }

    const Product = require('../models/ProductSchema');

    let invoice;

    if (lines && Array.isArray(lines)) {
      const items = await Promise.all(
        lines.map(async (line) => {
          const quantity = parseInt(line.quantity) || 1;
          const unitPriceHT = parseFloat(line.price) || 0;
          const vatRate = parseFloat(line.vatRate) || 20;
          const discount = parseFloat(line.discount) || 0;
          
          let productName = line.name || line.description || 'Produit';
          let productId = null;
          
          if (line.productId) {
            const product = await Product.findById(line.productId);
            if (product) {
              productId = product._id;
              productName = product.name;
            }
          }
          
          return {
            productId,
            name: productName,
            description: line.description || '',
            quantity,
            unitPriceHT,
            vatRate,
            discount,
            totalHT: quantity * unitPriceHT * (1 - discount / 100)
          };
        })
      );

      const subtotalHT = items.reduce((sum, item) => sum + item.totalHT, 0);
      const totalVat = items.reduce((sum, item) => sum + (item.totalHT * item.vatRate / 100), 0);
      const totalTTC = subtotalHT + totalVat;

      const updateData = {
        ...(clientId && { clientId }),
        ...(number && { number }),
        ...(date && { issueDate: new Date(date) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        items,
        subtotalHT,
        totalVat,
        totalTTC,
      };

      invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      )
        .populate('clientId', 'companyName email')
        .populate('items.productId');
    } else {
      invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      )
        .populate('clientId', 'companyName email')
        .populate('items.productId');
    }

    await logAudit({
      userId: req.user?._id,
      action: "update",
      entity: "Invoice",
      entityId: invoice._id,
      changes: req.body,
      req
    });
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
    await logAudit({
      userId: req.user?._id,
      action: "delete",
      entity: "Invoice",
      entityId: req.params.id,
      changes: { message: "Invoice deleted" },
      req
    });
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
