const AuditLog = require("../models/AuditLogSchema");

const getClientIP = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map(ip => ip.trim());
    const validIP = ips.find(ip => {
      const parts = ip.split(".");
      if (parts.length === 4) {
        return parts.every(part => {
          const num = parseInt(part, 10);
          return !isNaN(num) && num >= 0 && num <= 255;
        });
      }
      return ip.includes(":");
    });
    if (validIP) return validIP;
  }
  
  const realIP = req.headers["x-real-ip"];
  if (realIP && /^(\d{1,3}\.){3}\d{1,3}$/.test(realIP)) {
    return realIP;
  }
  
  if (req.ip) {
    const ip = req.ip.replace(/^::ffff:/, "");
    if (ip !== "127.0.0.1" && ip !== "::1" && ip !== "::ffff:127.0.0.1") {
      return ip;
    }
  }
  
  return req.socket?.remoteAddress?.replace(/^::ffff:/, "") || "unknown";
};

const logAudit = async ({ userId, action, entity, entityId, changes, req }) => {
  try {
    await AuditLog.create({
      userId: userId || null,
      action,
      entity,
      entityId,
      changes,
      ipAddress: getClientIP(req),
      userAgent: req.headers["user-agent"] ? req.headers["user-agent"].substring(0, 500) : null
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
};

module.exports = logAudit;
