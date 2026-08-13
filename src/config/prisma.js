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

// Signal handling lives in server.js, which owns the HTTP server and can drain
// in-flight requests before disconnecting. Registering listeners here too would
// race with that and exit the process mid-request.

module.exports = prisma;
