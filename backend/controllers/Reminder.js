const Reminder = require('../models/ReminderSchema');
const Invoice = require('../models/InvoiceSchema');

const getAllReminders = async (req, res) => {
  try {
    const { clientId, invoiceId, status, type } = req.query;
    let query = {};

    if (clientId) query.clientId = clientId;
    if (invoiceId) query.invoiceId = invoiceId;
    if (status) query.status = status;
    if (type) query.type = type;

    const reminders = await Reminder.find(query)
      .populate('clientId', 'companyName email phone')
      .populate('invoiceId', 'number totalTTC dueDate status')
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
      .populate('invoiceId', 'number totalTTC dueDate status');
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
      .populate('invoiceId', 'number totalTTC dueDate status');
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

const getUpcomingReminders = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const reminders = await Reminder.find({
      status: 'pending',
      scheduledDate: {
        $gte: now,
        $lte: sevenDaysLater
      }
    })
      .populate('clientId', 'companyName email phone')
      .populate('invoiceId', 'number totalTTC dueDate status')
      .sort({ scheduledDate: 1 });

    res.status(200).json({
      data: reminders,
      count: reminders.length,
      period: {
        from: now,
        to: sevenDaysLater
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getReminderStats = async (req, res) => {
  try {
    const byStatus = await Reminder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const byType = await Reminder.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const overdueInvoices = await Invoice.countDocuments({
      status: 'en_retard'
    });

    const pendingReminders = await Reminder.countDocuments({
      status: 'pending'
    });

    const statusStats = {
      pending: 0,
      sent: 0,
      failed: 0
    };

    byStatus.forEach(stat => {
      if (stat._id in statusStats) {
        statusStats[stat._id] = stat.count;
      }
    });

    const typeStats = {
      payment: 0,
      followup: 0,
      renewal: 0
    };

    byType.forEach(stat => {
      if (stat._id in typeStats) {
        typeStats[stat._id] = stat.count;
      }
    });

    res.status(200).json({
      byStatus: statusStats,
      byType: typeStats,
      overdueInvoices,
      pendingReminders,
      total: statusStats.pending + statusStats.sent + statusStats.failed
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const sendBatchReminders = async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const result = await Reminder.updateMany(
      {
        status: 'pending',
        scheduledDate: {
          $gte: now,
          $lte: sevenDaysLater
        }
      },
      {
        $set: {
          status: 'sent',
          sentDate: now
        }
      }
    );

    const sentReminders = await Reminder.find({
      status: 'sent',
      sentDate: { $gte: now }
    })
      .populate('clientId', 'companyName email')
      .populate('invoiceId', 'number totalTTC');

    res.status(200).json({
      message: 'Batch send completed',
      modifiedCount: result.modifiedCount,
      reminders: sentReminders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  getUpcomingReminders,
  getReminderStats,
  sendBatchReminders
};
