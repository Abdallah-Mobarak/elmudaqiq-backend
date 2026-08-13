// src/config/prisma.js
const { PrismaClient } = require("@prisma/client");

// A single shared client for the whole app.
// Every service/controller must `require` this file instead of calling
// `new PrismaClient()` — each extra client opens its own connection pool
// and exhausts MySQL's max_connections on production.
// Cached on globalThis so nodemon hot-reloads don't leak pools in dev.
const prisma =
  globalThis.__almudaqiqPrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__almudaqiqPrisma = prisma;
}

// Close the pool cleanly so MySQL frees the connections on restart/deploy.
// Attaching a signal listener suppresses Node's default "exit on signal", so the
// handler has to terminate the process itself or PM2 would stall until it sends
// SIGKILL.
const shutdown = async () => {
  try { await prisma.$disconnect(); } catch (_) { /* already closed */ }
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

module.exports = prisma;
