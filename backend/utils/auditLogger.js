const AuditLog = require("../models/AuditLogSchema");

const logAudit = async ({ userId, action, entity, entityId, changes, req }) => {
  try {
    await AuditLog.create({
      userId: userId || null,
      action,
      entity,
      entityId,
      changes,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
};

module.exports = logAudit;
