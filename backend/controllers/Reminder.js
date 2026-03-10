const Reminder = require('../models/ReminderSchema');

const getAllReminders = async (req, res) => {
  try {
    const { clientId, invoiceId, status, type } = req.query;
    let query = {};

    if (clientId) query.clientId = clientId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (status) query.status = status;
    if (type) query.type = type;

    const reminders = await Reminder.find(query)
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC dueDate')
      .sort({ scheduledDate: -1 });
    res.status(200).json(reminders);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getReminderById = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id)
      .populate('clientId', 'companyName email phone')
      .populate('invoiceId', 'number totalTTC dueDate status');
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.status(200).json(reminder);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createReminder = async (req, res) => {
  try {
    const reminder = new Reminder(req.body);
    await reminder.save();
    const populatedReminder = await Reminder.findById(reminder._id)
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC');
    res.status(201).json({ message: 'Reminder created successfully', reminder: populatedReminder });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC');
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.status(200).json({ message: 'Reminder updated successfully', reminder });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findByIdAndDelete(req.params.id);
    if (!reminder) {
      return res.status(404).json({ message: 'Reminder not found' });
    }
    res.status(200).json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder
};
