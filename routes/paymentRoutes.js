const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

/**
 * POST /create-checkout-session
 * Create a new Stripe checkout session
 */
router.post(
  "/create-checkout-session",
  paymentController.createCheckoutSession
);

/**
 * GET /session-status
 * Get the status of a checkout session
 */
router.get("/session-status", paymentController.getSessionStatus);

/**
 * GET /api/payments
 * Get all payments with optional filters
 * Query params: email, status, limit, page
 */
router.get("/api/payments", paymentController.getAllPayments);

/**
 * GET /api/payment/:sessionId
 * Get a specific payment by session ID
 */
router.get("/api/payment/:sessionId", paymentController.getPaymentBySessionId);

/**
 * GET /api/payment-stats
 * Get payment statistics
 */
router.get("/api/payment-stats", paymentController.getPaymentStats);

/**
 * GET /api/payments/customer/:email
 * Get all payments for a specific customer
 */
router.get(
  "/api/payments/customer/:email",
  paymentController.getPaymentsByEmail
);

/**
 * POST /api/free-registration
 * Handle free ticket registration
 */
router.post("/api/free-registration", paymentController.handleFreeRegistration);

module.exports = router;
