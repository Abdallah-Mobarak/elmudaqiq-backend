const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resolveTenant(req, res, next) {
  try {
    let subdomain;

    // ===============================
    // LOCAL DEVELOPMENT
    // ===============================
    if (process.env.NODE_ENV !== "production") {
      // هنستخدم header مؤقت
      subdomain = req.headers["x-tenant"];
    }

    // ===============================
    // PRODUCTION
    // ===============================
    if (process.env.NODE_ENV === "production") {
      const host = req.hostname; // khalil.almudaqiq.com

      if (!host) {
        return res.status(400).json({ message: "Invalid host" });
      }

      const parts = host.split(".");
      subdomain = parts[0];

      // حماية من www / api / root domain
      if (!subdomain || ["www", "api", "almudaqiq"].includes(subdomain)) {
        return res.status(400).json({ message: "Invalid tenant" });
      }
    }

    if (!subdomain) {
      return res.status(400).json({ message: "Tenant is required" });
    }

    // ===============================
    // GET SUBSCRIBER
    // ===============================
    const subscriber = await prisma.subscriber.findUnique({
      where: { subdomain },
    });

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found" });
    }

    if (subscriber.status !== "ACTIVE") {
      return res.status(403).json({ message: "Subscriber is inactive" });
    }

    // ===============================
    // ATTACH TO REQUEST
    // ===============================
    req.subscriber = subscriber;

    next();
  } catch (error) {
    console.error("Resolve Tenant Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = resolveTenant;
