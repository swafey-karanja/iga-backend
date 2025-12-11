// routes/mpesaRoutes.js
const express = require("express");
const router = express.Router();
const mpesaControllers = require("../controllers/mpesaControllers");
const {
  validatePaymentRequest,
  validateCheckoutRequestId,
} = require("../middleware/validation");
const { verifyCallbackIP, rateLimit } = require("../middleware/security");

// Initiate M-Pesa STK Push (with rate limiting)
router.post(
  "/initiate",
  rateLimit,
  validatePaymentRequest,
  mpesaControllers.initiatePayment
);

// M-Pesa callback endpoint (secured with IP verification)
router.post("/callback", verifyCallbackIP, mpesaControllers.handleCallback);

// Check payment status
router.get(
  "/status/:checkoutRequestId",
  validateCheckoutRequestId,
  mpesaControllers.checkPaymentStatus
);

// Query M-Pesa transaction status (manual check)
router.get(
  "/query/:checkoutRequestId",
  validateCheckoutRequestId,
  mpesaControllers.queryTransaction
);

// Admin routes (you should add authentication middleware here)
router.get("/summary", mpesaControllers.getTransactionSummary);
router.get("/customer/:email", mpesaControllers.getCustomerTransactions);

module.exports = router;
