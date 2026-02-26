const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function resolveTenant(req, res, next) {
  try {
    let subdomain;

    // 1. Check Header (Priority for API Testing/Postman)
    if (req.headers["x-tenant"]) {
      subdomain = req.headers["x-tenant"];
    }

    // 2. Check Hostname (Browser/Production/Local with hosts file)
    if (!subdomain) {
      const host = req.hostname; 

      if (host) {
        const parts = host.split(".");
        
        // Logic to extract subdomain:
        // Production: sub.domain.com -> parts[0]
        // Local with hosts: sub.localhost -> parts[0]
        // Ignore 'www', 'api', or direct IP/localhost access
        if (parts.length > 1 && !["www", "api", "mudqiq"].includes(parts[0])) {
           // Ensure it's not just "localhost" (length 1)
           // Localhost logic: parts[1] is 'localhost' (e.g. tenant.localhost)
           // Production logic: parts length is usually 3 (tenant.domain.com)
           if (parts.length >= 3 || parts.includes("localhost")) {
             subdomain = parts[0];
           }
        }
      } 
    }

    if (!subdomain) {
      // If no tenant found, treat as Admin/Public
      return next();
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
