const AuditLog = require('../models/AuditLogSchema');

const getAllAuditLogs = async (req, res) => {
  try {
    const { userId, entity, action, startDate, endDate, timeRange } = req.query;
    let query = {};

    if (userId) query.userId = userId;
    if (entity) query.entity = entity;
    if (action) query.action = action;

    const now = new Date();
    let calculatedStartDate = null;
    let calculatedEndDate = null;

    if (timeRange && timeRange !== 'all') {
      calculatedEndDate = new Date(now);
      calculatedEndDate.setHours(23, 59, 59, 999);

      switch (timeRange) {
        case 'day':
          calculatedStartDate = new Date(now);
          calculatedStartDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          calculatedStartDate = new Date(now);
          calculatedStartDate.setDate(now.getDate() - 7);
          calculatedStartDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          calculatedStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
          calculatedStartDate.setHours(0, 0, 0, 0);
          break;
        case 'last_month':
          const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          calculatedStartDate = new Date(firstDayThisMonth);
          calculatedStartDate.setMonth(calculatedStartDate.getMonth() - 1);
          calculatedEndDate = new Date(firstDayThisMonth);
          calculatedEndDate.setDate(calculatedEndDate.getDate() - 1);
          calculatedEndDate.setHours(23, 59, 59, 999);
          break;
        case 'quarter':
          calculatedStartDate = new Date(now);
          calculatedStartDate.setMonth(now.getMonth() - 3);
          calculatedStartDate.setHours(0, 0, 0, 0);
          break;
        case 'year':
          calculatedStartDate = new Date(now.getFullYear(), 0, 1);
          calculatedStartDate.setHours(0, 0, 0, 0);
          break;
        default:
          break;
      }

      if (calculatedStartDate && calculatedEndDate) {
        query.createdAt = {
          $gte: calculatedStartDate,
          $lte: calculatedEndDate
        };
      }
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        calculatedStartDate = new Date(startDate);
        calculatedStartDate.setHours(0, 0, 0, 0);
        query.createdAt.$gte = calculatedStartDate;
      }
      if (endDate) {
        calculatedEndDate = new Date(endDate);
        calculatedEndDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = calculatedEndDate;
      }
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).populate('userId', 'name email role');
    if (!log) {
      return res.status(404).json({ message: 'Audit log not found' });
    }
    res.status(200).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createAuditLog = async (req, res) => {
  try {
    const log = new AuditLog(req.body);
    await log.save();
    res.status(201).json({ message: 'Audit log created successfully', log });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllAuditLogs,
  getAuditLogById,
  createAuditLog
};
