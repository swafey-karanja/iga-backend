const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Middleware to verify Stripe webhook signatures
 * This ensures webhooks are actually from Stripe
 */
const verifyStripeWebhook = (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not set in environment variables");
    return res.status(500).send("Webhook secret not configured");
  }

  try {
    // Construct the event using the raw body and signature
    const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

    // Attach the verified event to the request object
    req.stripeEvent = event;
    next();
  } catch (err) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

module.exports = verifyStripeWebhook;
