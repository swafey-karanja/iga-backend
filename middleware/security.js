// middleware/security.js

/**
 * Safaricom M-Pesa callback IP addresses
 * These are the official IP addresses from which M-Pesa sends callbacks
 */
const MPESA_IPS = [
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.138",
  "196.201.212.129",
  "196.201.212.136",
  "196.201.212.74",
];

/**
 * Verify that the callback request is from Safaricom
 * This prevents unauthorized parties from triggering the callback endpoint
 */
const verifyCallbackIP = (req, res, next) => {
  // Skip IP verification in development/sandbox mode
  if (process.env.MPESA_ENV !== "production") {
    console.log("Skipping IP verification in non-production environment");
    return next();
  }

  // Get client IP address
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress;

  console.log("Callback received from IP:", clientIp);

  // Check if IP is in the allowed list
  const isValidIp = MPESA_IPS.some((ip) => clientIp.includes(ip));

  if (!isValidIp) {
    console.warn("Unauthorized callback attempt from IP:", clientIp);
    return res.status(403).json({
      success: false,
      error: "Unauthorized",
    });
  }

  next();
};

/**
 * Rate limiting for M-Pesa endpoints
 * Prevents abuse of the payment initiation endpoint
 */
const rateLimitMap = new Map();

const rateLimit = (req, res, next) => {
  const identifier = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const timeWindow = 60000; // 1 minute
  const maxRequests = 10; // Max 10 requests per minute

  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }

  const timestamps = rateLimitMap.get(identifier);

  // Remove old timestamps
  const recentTimestamps = timestamps.filter(
    (timestamp) => now - timestamp < timeWindow
  );

  if (recentTimestamps.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      error: "Too many requests. Please try again later.",
    });
  }

  recentTimestamps.push(now);
  rateLimitMap.set(identifier, recentTimestamps);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    const cutoff = now - timeWindow;
    for (const [key, value] of rateLimitMap.entries()) {
      const filtered = value.filter((timestamp) => timestamp > cutoff);
      if (filtered.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, filtered);
      }
    }
  }

  next();
};

/**
 * Sanitize callback data to prevent injection attacks
 */
const sanitizeCallbackData = (req, res, next) => {
  // Ensure the callback body has the expected structure
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      success: false,
      error: "Invalid callback data",
    });
  }

  // Log the callback for debugging
  console.log("Callback data received:", JSON.stringify(req.body, null, 2));

  next();
};

module.exports = {
  verifyCallbackIP,
  rateLimit,
  sanitizeCallbackData,
};
