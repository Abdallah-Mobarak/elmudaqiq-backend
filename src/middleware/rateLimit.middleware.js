// Fixed-window rate limiter, deliberately dependency-free so deploying it is
// just a pull and a restart.
//
// State is process-local. The app runs as a single PM2 fork, so that covers
// every request today; switching PM2 to cluster mode would need a shared store.
const buckets = new Map();

// Expired buckets are swept so the map cannot grow without bound. unref() keeps
// the timer from holding the event loop open at shutdown.
const SWEEP_INTERVAL_MS = 60_000;
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweeper.unref();

const clientIp = (req) => {
  // Behind nginx every request looks like 127.0.0.1 unless the proxy forwards
  // the real address, so read the forwarded chain first.
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
};

/**
 * @param {object}   opts
 * @param {number}   opts.windowMs  length of the window
 * @param {number}   opts.max       allowed requests per window
 * @param {string}   [opts.message] response message once the limit is hit
 * @param {function} [opts.identify] extra key part, e.g. the email being tried.
 *   Worth passing on auth routes: if the proxy is not forwarding real IPs, an
 *   IP-only key would lump every user into one bucket and a single attacker
 *   could lock the whole system out. Keying on the account under attack keeps
 *   the limit where it belongs.
 */
module.exports = ({ windowMs, max, message, identify }) => (req, res, next) => {
  const parts = [clientIp(req), req.baseUrl + req.path];
  if (identify) {
    const extra = identify(req);
    if (extra) parts.push(String(extra).toLowerCase());
  }
  const key = parts.join("|");

  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;

  const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
  res.setHeader("RateLimit-Limit", String(max));
  res.setHeader("RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
  res.setHeader("RateLimit-Reset", String(retryAfter));

  if (bucket.count > max) {
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: message || `عدد محاولات كبير. برجاء المحاولة بعد ${retryAfter} ثانية.`,
    });
  }

  next();
};
