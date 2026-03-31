const Invoice = require('../models/InvoiceSchema');
const Payment = require('../models/PaymentSchema');
const CashTransaction = require('../models/CashTransactionSchema');
const Settings = require('../models/SettingsSchema');
const logAudit = require('../utils/auditLogger');
const nodemailer = require('nodemailer');

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

    const statusMap = { draft: 'brouillon', sent: 'envoyé', paid: 'payé', overdue: 'en_retard', cancelled: 'annulé' };
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
        ...(status && { status: statusMap[status] || status }),
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
      const updateData = { ...req.body };
      if (status && !statusMap[status] && !['brouillon', 'envoyé', 'payé', 'en_retard', 'annulé'].includes(status)) {
        updateData.status = statusMap[status] || status;
      } else if (status) {
        updateData.status = statusMap[status] || status;
      }
      invoice = await Invoice.findByIdAndUpdate(
        req.params.id,
        updateData,
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
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoiceId = invoice._id;

    const payments = await Payment.find({ invoiceId });
    const paymentIds = payments.map(p => p._id);

    if (paymentIds.length > 0) {
      await Payment.deleteMany({ invoiceId });
      await CashTransaction.deleteMany({ sourceId: { $in: paymentIds } });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    
    await logAudit({
      userId: req.user?._id,
      action: "delete",
      entity: "Invoice",
      entityId: req.params.id,
      changes: { message: "Invoice deleted", cascadeDeletedPayments: paymentIds.length },
      req
    });
    res.status(200).json({ message: 'Invoice deleted successfully', deletedPayments: paymentIds.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const sendInvoiceEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipientEmail, subject, message } = req.body;
    
    const invoice = await Invoice.findById(id)
      .populate('clientId', 'companyName email phone address ice');
    
    if (!invoice) {
      return res.status(404).json({ message: 'Facture non trouvée' });
    }
    
    const settings = await Settings.findOne();
    const notif = settings?.notifications || {};
    
    if (!notif.smtpHost || !notif.smtpUser) {
      return res.status(400).json({ message: 'Configuration SMTP incomplète. Veuillez configurer les paramètres email dans les paramètres.' });
    }
    
    const transporter = nodemailer.createTransport({
      host: notif.smtpHost,
      port: notif.smtpPort || 587,
      secure: notif.smtpSecure || false,
      auth: {
        user: notif.smtpUser,
        pass: notif.smtpPass,
      },
    });
    
    const clientName = invoice.clientId?.companyName || 'Client';
    const clientEmail = recipientEmail || invoice.clientId?.email;
    
    if (!clientEmail) {
      return res.status(400).json({ message: 'Email du client non disponible' });
    }
    
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount || 0);
    };
    
    const formatDate = (date) => {
      return new Intl.DateTimeFormat('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(date));
    };
    
    const itemsHtml = invoice.items?.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description || item.name || 'Produit'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPriceHT)} MAD</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.vatRate || 0}%</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.totalHT)} MAD</td>
      </tr>
    `).join('') || '';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">FACTURE</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${invoice.number}</p>
        </div>
        
        <div style="padding: 20px; background: #f9fafb;">
          <div style="margin-bottom: 20px;">
            <strong>Client:</strong> ${clientName}<br>
            <strong>Date d'émission:</strong> ${formatDate(invoice.issueDate)}<br>
            <strong>Date d'échéance:</strong> ${formatDate(invoice.dueDate)}
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #e5e7eb;">
                <th style="padding: 10px; text-align: left;">Description</th>
                <th style="padding: 10px; text-align: center;">Qté</th>
                <th style="padding: 10px; text-align: right;">Prix HT</th>
                <th style="padding: 10px; text-align: right;">TVA</th>
                <th style="padding: 10px; text-align: right;">Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="text-align: right;">
            <p><strong>Sous-total HT:</strong> ${formatCurrency(invoice.subtotalHT)} MAD</p>
            <p><strong>TVA (20%):</strong> ${formatCurrency(invoice.totalVat)} MAD</p>
            <p style="font-size: 1.2em;"><strong>TOTAL TTC:</strong> ${formatCurrency(invoice.totalTTC)} MAD</p>
          </div>
          
          ${message ? `<div style="margin-top: 20px; padding: 15px; background: white; border-left: 4px solid #1e3a5f;">
            <strong>Message:</strong><br>
            ${message}
          </div>` : ''}
        </div>
        
        <div style="background: #1e3a5f; color: white; padding: 15px; text-align: center; font-size: 12px;">
          ${settings.company?.name || 'Votre Entreprise'} | ICE: ${settings.company?.ice || 'N/A'}
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: `"${notif.smtpFromName || settings.company?.name || 'CRM'}" <${notif.smtpFromEmail || notif.smtpUser}>`,
      to: clientEmail,
      subject: subject || `Facture ${invoice.number} - ${settings.company?.name || 'Votre Entreprise'}`,
      html: emailHtml,
    };
    
    await transporter.sendMail(mailOptions);
    
    if (invoice.status === 'brouillon') {
      await Invoice.findByIdAndUpdate(id, { status: 'envoyé' });
    }
    
    await logAudit({
      userId: req.user?._id,
      action: "email_sent",
      entity: "Invoice",
      entityId: id,
      changes: { recipient: clientEmail, subject: mailOptions.subject },
      req
    });
    
    res.status(200).json({ message: 'Email envoyé avec succès', sentTo: clientEmail });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email', error: error.message });
  }
};

module.exports = {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoiceEmail
};
