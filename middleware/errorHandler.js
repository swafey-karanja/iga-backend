/**
 * Global error handling middleware
 * Catches all errors and sends appropriate response
 */
const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: "Validation Error",
      details: errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      error: `Duplicate ${field}`,
      message: `This ${field} already exists`,
    });
  }

  // Stripe error
  if (err.type && err.type.startsWith("Stripe")) {
    return res.status(400).json({
      success: false,
      error: "Stripe Error",
      message: err.message,
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorHandler;
