const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
const verifyStripeWebhook = require("../middleware/stripeWebhook");

/**
 * POST /webhook
 * Stripe webhook endpoint
 * Note: This route uses raw body parser (express.raw) in server.js
 */
router.post(
  "/",
  express.raw({ type: "application/json" }),
  verifyStripeWebhook,
  webhookController.handleWebhook
);

module.exports = router;
