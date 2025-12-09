const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");

/**
 * Main webhook handler
 * Routes events to appropriate handlers
 */
exports.handleWebhook = async (req, res) => {
  const event = req.stripeEvent;

  console.log(`📨 Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Webhook processing error",
      message: error.message,
    });
  }
};

/**
 * Handle checkout session completed
 * Creates initial payment record
 */
async function handleCheckoutSessionCompleted(session) {
  console.log("💳 Processing checkout session:", session.id);
  console.log({ session });

  try {
    // Retrieve line items to get ticket details
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

    // Calculate discount if any
    let discountAmount = 0;
    if (session.total_details?.amount_discount) {
      discountAmount = session.total_details.amount_discount;
    }

    // Parse customer info from metadata
    let customerInfo = {};
    try {
      if (session.metadata?.customerInfo) {
        customerInfo = JSON.parse(session.metadata.customerInfo);
      }
    } catch (parseError) {
      console.error("❌ Error parsing customerInfo from metadata:", parseError);
      // Fallback to extracting from individual metadata fields if JSON parse fails
      customerInfo = {
        firstName: session.metadata?.firstName || "",
        lastName: session.metadata?.lastName || "",
        email: session.customer_details?.email || "",
        phone: session.metadata?.phone || "",
        company: session.metadata?.company || "",
        jobTitle: session.metadata?.jobTitle || "",
        country: session.metadata?.country || "",
        agreeToTerms: true,
      };
    }

    // Build metadata object with customerInfo
    const metadata = {
      ...session.metadata,
      customerInfo: customerInfo,
      promoCode: session.metadata?.promoCode || "",
      idempotencyKey: session.metadata?.idempotencyKey || "",
      ticketLabel: session.metadata?.ticketLabel || "",
    };

    const paymentData = {
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      customerEmail: customerInfo.email || session.customer_details?.email,
      amount: session.amount_total,
      currency: session.currency,
      status: session.payment_status === "paid" ? "succeeded" : "pending",
      ticketId: lineItems.data[0]?.price?.id,
      ticketLabel: session.metadata?.ticketLabel || "",
      promoCode: session.metadata?.promoCode || null,
      discountAmount: discountAmount,
      idempotencyKey: session.metadata?.idempotencyKey || null,
      metadata: metadata,
    };

    // Upsert payment record
    const payment = await Payment.findOneAndUpdate(
      { stripeSessionId: session.id },
      paymentData,
      { upsert: true, new: true }
    );

    console.log("✅ Payment record saved:", payment._id);
  } catch (error) {
    console.error("❌ Error in handleCheckoutSessionCompleted:", error);
    throw error;
  }
}

/**
 * Handle payment intent succeeded
 * Updates payment status to succeeded
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log("✅ Processing payment success:", paymentIntent.id);

  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "succeeded",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      { new: true }
    );

    if (payment) {
      console.log("✅ Payment status updated to succeeded:", payment._id);
    } else {
      console.log("⚠️ Payment not found for payment intent:", paymentIntent.id);
    }
  } catch (error) {
    console.error("❌ Error in handlePaymentIntentSucceeded:", error);
    throw error;
  }
}

/**
 * Handle payment intent failed
 * Updates payment status to failed
 */
async function handlePaymentIntentFailed(paymentIntent) {
  console.log("❌ Processing payment failure:", paymentIntent.id);

  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      {
        status: "failed",
        metadata: {
          ...paymentIntent.metadata,
          failureCode: paymentIntent.last_payment_error?.code,
          failureMessage: paymentIntent.last_payment_error?.message,
        },
      },
      { new: true }
    );

    if (payment) {
      console.log("✅ Payment status updated to failed:", payment._id);
    } else {
      console.log("⚠️ Payment not found for payment intent:", paymentIntent.id);
    }
  } catch (error) {
    console.error("❌ Error in handlePaymentIntentFailed:", error);
    throw error;
  }
}

/**
 * Handle charge refunded
 * Updates payment status to refunded
 */
async function handleChargeRefunded(charge) {
  console.log("💰 Processing refund:", charge.id);

  try {
    const payment = await Payment.findOneAndUpdate(
      { stripePaymentIntentId: charge.payment_intent },
      {
        status: "refunded",
        refundAmount: charge.amount_refunded,
        refundedAt: new Date(),
      },
      { new: true }
    );

    if (payment) {
      console.log("✅ Payment status updated to refunded:", payment._id);
    } else {
      console.log("⚠️ Payment not found for charge:", charge.id);
    }
  } catch (error) {
    console.error("❌ Error in handleChargeRefunded:", error);
    throw error;
  }
}
