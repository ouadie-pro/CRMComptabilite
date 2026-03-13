const AuditLog = require('../models/AuditLogSchema');

const getAllAuditLogs = async (req, res) => {
  try {
    const { userId, entity, action, startDate, endDate, timeRange } = req.query;
    let query = {};

    if (userId) query.userId = userId;
    if (entity) query.entity = entity;
    if (action) query.action = action;

    if (timeRange && timeRange !== 'all') {
      const now = new Date();
      query.createdAt = {};
      
      switch (timeRange) {
        case 'day':
          query.createdAt.$gte = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          query.createdAt.$gte = weekStart;
          break;
        case 'month':
          query.createdAt.$gte = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          query.createdAt.$gte = new Date(now.getFullYear(), 0, 1);
          break;
      }
    } else if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
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
