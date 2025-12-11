// middleware/validation.js

/**
 * Validate payment request data
 */
const validatePaymentRequest = (req, res, next) => {
  const { phoneNumber, amount, customerInfo } = req.body;

  // Check required fields
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: "Phone number is required",
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      error: "Valid amount is required",
    });
  }

  if (!customerInfo) {
    return res.status(400).json({
      success: false,
      error: "Customer information is required",
    });
  }

  // Validate customer info
  const requiredCustomerFields = ["firstName", "lastName", "email", "country"];
  const missingFields = requiredCustomerFields.filter(
    (field) => !customerInfo[field]
  );

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Missing required customer fields: ${missingFields.join(", ")}`,
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(customerInfo.email)) {
    return res.status(400).json({
      success: false,
      error: "Invalid email format",
    });
  }

  // Validate phone number format (basic validation)
  const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");

  if (!phoneRegex.test(cleanPhone) && !cleanPhone.startsWith("254")) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid Kenya phone number format. Use format: 254XXXXXXXXX or 07XXXXXXXX",
    });
  }

  // Validate amount (M-Pesa minimum is 1 KES)
  if (amount < 1) {
    return res.status(400).json({
      success: false,
      error: "Amount must be at least 1 KES",
    });
  }

  // Validate amount (M-Pesa maximum is 150,000 KES for customer transactions)
  if (amount > 150000) {
    return res.status(400).json({
      success: false,
      error: "Amount exceeds M-Pesa transaction limit (150,000 KES)",
    });
  }

  next();
};

/**
 * Validate checkout request ID parameter
 */
const validateCheckoutRequestId = (req, res, next) => {
  const { checkoutRequestId } = req.params;

  if (!checkoutRequestId) {
    return res.status(400).json({
      success: false,
      error: "Checkout request ID is required",
    });
  }

  // Basic format validation for M-Pesa checkout request ID
  if (!/^[a-zA-Z0-9\-_]+$/.test(checkoutRequestId)) {
    return res.status(400).json({
      success: false,
      error: "Invalid checkout request ID format",
    });
  }

  next();
};

module.exports = {
  validatePaymentRequest,
  validateCheckoutRequestId,
};
