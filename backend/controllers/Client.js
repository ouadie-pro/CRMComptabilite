const Client = require('../models/ClientSchema');
const Invoice = require('../models/InvoiceSchema');
const logAudit = require('../utils/auditLogger');

const getAllClients = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10 } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [clients, total] = await Promise.all([
      Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Client.countDocuments(query)
    ]);
    
    const clientsWithTotal = await Promise.all(
      clients.map(async (client) => {
        const clientObj = client.toObject();
        const invoiceAgg = await Invoice.aggregate([
          { $match: { clientId: client._id } },
          { $group: { _id: null, total: { $sum: '$totalTTC' } } }
        ]);
        clientObj.totalBilled = invoiceAgg.length > 0 ? invoiceAgg[0].total : 0;
        return clientObj;
      })
    );
    
    res.status(200).json({
      data: clientsWithTotal,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const clientObj = client.toObject();
    
    const invoiceAgg = await Invoice.aggregate([
      { $match: { clientId: client._id } },
      { $group: { _id: null, total: { $sum: '$totalTTC' }, count: { $sum: 1 } } }
    ]);
    
    const paymentAgg = await Invoice.aggregate([
      { $match: { clientId: client._id, status: 'payé' } },
      { $group: { _id: null, totalPaid: { $sum: '$totalPaid' } } }
    ]);

    clientObj.totalBilled = invoiceAgg.length > 0 ? invoiceAgg[0].total : 0;
    clientObj.totalPaid = paymentAgg.length > 0 ? paymentAgg[0].totalPaid : 0;
    clientObj.invoiceCount = invoiceAgg.length > 0 ? invoiceAgg[0].count : 0;
    
    res.status(200).json(clientObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createClient = async (req, res) => {
  try {
    const { companyName, name, contactName, contactTitle, status, city, country, ...rest } = req.body;
    
    if (!companyName && !name) {
      return res.status(400).json({ message: 'Le nom de l\'entreprise est requis' });
    }
    if (!req.body.email) {
      return res.status(400).json({ message: 'L\'email est requis' });
    }
    
    const clientData = {
      ...rest,
      companyName: companyName || name || '',
      contactName: contactName || companyName || name || 'Client',
      contactTitle: contactTitle || 'Client',
      city,
      country,
      status: (status === 'active' || status === 'actif') ? 'actif' : 'nouveau',
    };
    const client = new Client(clientData);
    await client.save();
    await logAudit({
      userId: req.user?._id,
      action: "create",
      entity: "Client",
      entityId: client._id,
      changes: { companyName: client.companyName, email: client.email },
      req
    });
    res.status(201).json({ message: 'Client created successfully', client });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Client with this email already exists' });
    }
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return res.status(400).json({ message: 'Validation error', errors: Object.values(error.errors).map(e => e.message) });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { companyName, contactName, contactTitle, status, city, country, ...rest } = req.body;
    const updateData = {
      ...rest,
      ...(companyName && { companyName }),
      ...(contactName && { contactName }),
      ...(contactTitle && { contactTitle }),
      ...(status && { status: status === 'active' ? 'actif' : 'archivé' }),
      ...(city && { city }),
      ...(country && { country }),
    };
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: false }
    );
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    await logAudit({
      userId: req.user?._id,
      action: "update",
      entity: "Client",
      entityId: client._id,
      changes: req.body,
      req
    });
    res.status(200).json({ message: 'Client updated successfully', client });
  } catch (error) {
    console.error('Client update error:', error.message, error.errors);
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => `${key}: ${error.errors[key].message}`);
      return res.status(400).json({ message: 'Validation error', errors: validationErrors });
    }
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Client with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const Invoice = require('../models/InvoiceSchema');
    const Payment = require('../models/PaymentSchema');
    const CashTransaction = require('../models/CashTransactionSchema');
    const Reminder = require('../models/ReminderSchema');
    const Interaction = require('../models/InteractionSchema');

    const clientInvoices = await Invoice.find({ clientId: client._id });
    const invoiceIds = clientInvoices.map(inv => inv._id);
    const clientPayments = await Payment.find({ clientId: client._id });
    const paymentIds = clientPayments.map(pay => pay._id);

    await Promise.all([
      invoiceIds.length > 0 ? Invoice.deleteMany({ clientId: client._id }) : Promise.resolve(),
      clientPayments.length > 0 ? Payment.deleteMany({ clientId: client._id }) : Promise.resolve(),
      paymentIds.length > 0 ? CashTransaction.deleteMany({ sourceId: { $in: paymentIds } }) : Promise.resolve(),
      Reminder.deleteMany({ clientId: client._id }),
      Interaction.deleteMany({ clientId: client._id }),
      CashTransaction.deleteMany({ linkedInvoiceId: { $in: invoiceIds } }),
      Client.findByIdAndDelete(client._id)
    ]);

    await logAudit({
      userId: req.user?._id,
      action: "delete",
      entity: "Client",
      entityId: req.params.id,
      changes: { 
        message: "Client deleted with cascade",
        deletedInvoices: invoiceIds.length,
        deletedPayments: paymentIds.length,
        deletedReminders: await Reminder.countDocuments({ clientId: client._id }),
        deletedInteractions: await Interaction.countDocuments({ clientId: client._id })
      },
      req
    });
    res.status(200).json({ 
      message: 'Client deleted successfully',
      deletedInvoices: invoiceIds.length,
      deletedPayments: paymentIds.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
};
