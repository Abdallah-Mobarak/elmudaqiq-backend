const prisma = require("../config/prisma");
const net = require("net"); //check the ip

// Labels that are never a tenant: the apex itself, the API host, and www.
const RESERVED_LABELS = ["www", "api", "mudqiq", "localhost"];

/**
 * Pull the tenant label out of a hostname.
 * Production: office.mudqiq.com -> "office"
 * Local with a hosts entry: office.localhost -> "office"
 * Anything else (IPs, the apex, api.*, www.*) -> null
 */
function subdomainFromHost(host) {
  if (!host || net.isIP(host)) return null;

  const parts = host.split(".");
  if (parts.length <= 1) return null;
  if (RESERVED_LABELS.includes(parts[0])) return null;

  return parts.length >= 3 || parts.includes("localhost") ? parts[0] : null;
}

async function resolveTenant(req, res, next) {
  try {
    let subdomain;

    // 1. Check Header (Priority for API Testing/Postman/Frontend)
    const tenantHeader = req.headers["x-tenant"];
    // تجاهل الكلمات النصية اللي الفرونت إند بيبعتها بالغلط لما تكون المتغيرات فاضية
    if (tenantHeader && tenantHeader !== "undefined" && tenantHeader !== "null" && tenantHeader !== "") {
      subdomain = tenantHeader;
    }

    // 2. Check Hostname (Browser/Production/Local with hosts file)
    if (!subdomain) {
      subdomain = subdomainFromHost(req.hostname);
    }

    // 3. Fall back to the browser's Origin.
    // The API lives on api.mudqiq.com, so req.hostname is always "api" here and
    // step 2 can never identify a tenant in production. A browser on
    // office.mudqiq.com still sends Origin: https://office.mudqiq.com, which
    // means a subscriber request stays correctly scoped even if the frontend
    // forgets x-tenant — previously that silently fell through and the request
    // was handled as if it came from an admin.
    if (!subdomain && req.headers.origin) {
      try {
        subdomain = subdomainFromHost(new URL(req.headers.origin).hostname);
      } catch (_) {
        // Malformed Origin: ignore it and fall through to the public path.
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
      return res.status(404).json({ message: "Subscriber not found (Invalid Tenant)" });
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
