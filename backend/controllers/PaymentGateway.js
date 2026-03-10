const PaymentGateway = require('../models/PaymentGatewaySchema');

const getAllPaymentGateways = async (req, res) => {
  try {
    const { isActive } = req.query;
    let query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const gateways = await PaymentGateway.find(query);
    res.status(200).json(gateways);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPaymentGatewayById = async (req, res) => {
  try {
    const gateway = await PaymentGateway.findById(req.params.id);
    if (!gateway) {
      return res.status(404).json({ message: 'Payment gateway not found' });
    }
    res.status(200).json(gateway);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createPaymentGateway = async (req, res) => {
  try {
    const gateway = new PaymentGateway(req.body);
    await gateway.save();
    res.status(201).json({ message: 'Payment gateway created successfully', gateway });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Payment gateway with this name already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updatePaymentGateway = async (req, res) => {
  try {
    const gateway = await PaymentGateway.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!gateway) {
      return res.status(404).json({ message: 'Payment gateway not found' });
    }
    res.status(200).json({ message: 'Payment gateway updated successfully', gateway });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Payment gateway with this name already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deletePaymentGateway = async (req, res) => {
  try {
    const gateway = await PaymentGateway.findByIdAndDelete(req.params.id);
    if (!gateway) {
      return res.status(404).json({ message: 'Payment gateway not found' });
    }
    res.status(200).json({ message: 'Payment gateway deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllPaymentGateways,
  getPaymentGatewayById,
  createPaymentGateway,
  updatePaymentGateway,
  deletePaymentGateway
};
