const Client = require('../models/ClientSchema');
const Invoice = require('../models/InvoiceSchema');

const getAllClients = async (req, res) => {
  try {
    const { status, search } = req.query;
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

    const clients = await Client.find(query).sort({ createdAt: -1 });
    
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
    
    res.status(200).json(clientsWithTotal);
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
    res.status(200).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createClient = async (req, res) => {
  try {
    const { name, status, city, country, ...rest } = req.body;
    const clientData = {
      companyName: name,
      contactName: name,
      contactTitle: 'Client',
      status: status === 'active' ? 'actif' : 'inactif',
      city,
      country,
      ...rest,
    };
    const client = new Client(clientData);
    await client.save();
    res.status(201).json({ message: 'Client created successfully', client });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Client with this email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateClient = async (req, res) => {
  try {
    const { name, status, city, country, ...rest } = req.body;
    const updateData = {
      ...rest,
      ...(name && { companyName: name, contactName: name }),
      ...(status && { status: status === 'active' ? 'actif' : 'inactif' }),
      ...(city && { city }),
      ...(country && { country }),
    };
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
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
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    res.status(200).json({ message: 'Client deleted successfully' });
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
