// src/middleware/error.middleware.js
module.exports = (err, req, res, next) => {
  console.error("🔥 ERROR:", err);

  // Prisma record not found
  if (err && err.code === "P2025") {
    return res.status(404).json({ message: "Record not found" });
  }

  // Prisma unique constraint failed
  if (err && err.code === "P2002") {
    // try to extract meta target
    const target = err.meta && err.meta.target ? ` (${err.meta.target})` : "";
    return res.status(400).json({ message: `Duplicate value exists${target}` });
  }

  // Prisma foreign key constraint / parent not found
  if (err && err.code === "P2003") {
    return res.status(400).json({ message: "Invalid foreign key / Parent not found" });
  }

  // Prisma cannot delete due to relation (or constraint failed)
  if (err && err.code === "P2004") {
    return res.status(400).json({ message: "Cannot delete: related data exists" });
  }

  // Custom errors thrown in services: { customMessage, status }
  if (err && err.customMessage) {
    return res.status(err.status || 400).json({ message: err.customMessage });
  }

  // Validation libraries sometimes set .isJoi or similar
  if (err && err.isJoi) {
    return res.status(400).json({ message: err.details ? err.details.map(d => d.message).join(", ") : err.message });
  }

  // Default fallback
  return res.status(500).json({
    message: "Internal Server Error",
    error: err && err.message ? err.message : String(err)
  });
};
