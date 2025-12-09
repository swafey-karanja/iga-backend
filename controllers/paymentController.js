const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/Payment");

/**
 * Create Stripe checkout session
 */
exports.createCheckoutSession = async (req, res, next) => {
  const { ticketId, promoCode, idempotencyKey, customerInfo, ticketLabel } =
    req.body;

  console.log("📝 Creating checkout session:", {
    ticketId,
    promoCode,
    idempotencyKey,
    customerEmail: customerInfo?.email,
  });

  // Validate required customer information
  if (
    !customerInfo ||
    !customerInfo.firstName ||
    !customerInfo.lastName ||
    !customerInfo.email ||
    !customerInfo.phone ||
    !customerInfo.country
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required customer information",
      required: ["firstName", "lastName", "email", "phone", "country"],
    });
  }

  try {
    let discounts = [];

    // Validate and apply promo code if provided
    if (promoCode) {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: promoCode,
          active: true,
        });

        if (promotionCodes.data.length > 0) {
          const promotion = promotionCodes.data[0];
          discounts = [{ promotion_code: promotion.id }];

          if (promotion.coupon.percent_off) {
            console.log(
              `✅ Promo code applied: ${promoCode} (${promotion.coupon.percent_off}% off)`
            );
          } else if (promotion.coupon.amount_off) {
            console.log(
              `✅ Promo code applied: ${promoCode} ($${
                promotion.coupon.amount_off / 100
              } off)`
            );
          }
        } else {
          return res.status(400).json({
            success: false,
            error: "Invalid promo code",
          });
        }
      } catch (error) {
        console.error("❌ Error validating promo code:", error);
        return res.status(400).json({
          success: false,
          error: "Failed to validate promo code",
        });
      }
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price: ticketId,
          quantity: 1,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 10,
          },
        },
      ],
      discounts: discounts,
      mode: "payment",
      customer_email: customerInfo.email,
      metadata: {
        // Store complete customer info in metadata
        customerInfo: JSON.stringify(customerInfo),
        promoCode: promoCode || "",
        idempotencyKey: idempotencyKey || "",
        ticketLabel: ticketLabel || "",
      },
      return_url: `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/return?session_id={CHECKOUT_SESSION_ID}`,
    });

    console.log("✅ Checkout session created:", session.id);

    res.json({
      success: true,
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("❌ Error creating checkout session:", error);
    next(error);
  }
};

/**
 * Get session status
 */
exports.getSessionStatus = async (req, res, next) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.status(400).json({
      success: false,
      error: "session_id is required",
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    res.json({
      success: true,
      status: session.status,
      customer_email: session.customer_details?.email,
      payment_status: session.payment_status,
    });
  } catch (error) {
    console.error("❌ Error retrieving session:", error);
    next(error);
  }
};

/**
 * Get all payments with optional filters
 */
exports.getAllPayments = async (req, res, next) => {
  try {
    const { email, status, limit = 50, page = 1 } = req.query;
    const query = {};

    if (email) query["customerInfo.email"] = email;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      payments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    next(error);
  }
};

/**
 * Get payment by session ID
 */
exports.getPaymentBySessionId = async (req, res, next) => {
  const { sessionId } = req.params;

  try {
    const payment = await Payment.findOne({ stripeSessionId: sessionId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: "Payment not found",
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("❌ Error fetching payment:", error);
    next(error);
  }
};

/**
 * Get payment statistics
 */
exports.getPaymentStats = async (req, res, next) => {
  try {
    const stats = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalPayments = await Payment.countDocuments();
    const totalRevenue = await Payment.aggregate([
      { $match: { status: "succeeded" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const uniqueCustomers = await Payment.distinct("customerInfo.email");

    res.json({
      success: true,
      stats: {
        totalPayments,
        totalRevenue: totalRevenue[0]?.total || 0,
        uniqueCustomers: uniqueCustomers.length,
        byStatus: stats,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching payment stats:", error);
    next(error);
  }
};

/**
 * Get payments by customer email
 */
exports.getPaymentsByEmail = async (req, res, next) => {
  const { email } = req.params;

  try {
    const payments = await Payment.find({ "customerInfo.email": email }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      payments,
      total: payments.length,
    });
  } catch (error) {
    console.error("❌ Error fetching payments by email:", error);
    next(error);
  }
};

/**
 * Handle free ticket registration
 * Creates a payment record with $0 amount for free tickets
 */
exports.handleFreeRegistration = async (req, res, next) => {
  const { ticketId, ticketLabel, customerInfo, idempotencyKey } = req.body;

  console.log("🎟️ Processing free registration:", {
    ticketId,
    ticketLabel,
    idempotencyKey,
    customerEmail: customerInfo?.email,
  });

  // Validate required customer information
  if (
    !customerInfo ||
    !customerInfo.firstName ||
    !customerInfo.lastName ||
    !customerInfo.email ||
    !customerInfo.phone ||
    !customerInfo.country
  ) {
    return res.status(400).json({
      success: false,
      error: "Missing required customer information",
      required: ["firstName", "lastName", "email", "phone", "country"],
    });
  }

  try {
    // Create a unique session ID for free registrations
    const sessionId = `free_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create payment record for free ticket
    const paymentData = {
      stripeSessionId: sessionId,
      customerEmail: customerInfo.email,
      amount: 0,
      currency: "usd",
      status: "succeeded", // Free tickets are automatically succeeded
      ticketId: ticketId,
      ticketLabel: ticketLabel || "",
      promoCode: null,
      discountAmount: 0,
      idempotencyKey: idempotencyKey,
      metadata: {
        customerInfo: customerInfo,
        registrationType: "free",
        ticketLabel: ticketLabel,
      },
    };

    const payment = await Payment.create(paymentData);
    console.log("✅ Free registration record created:", payment._id);
    console.log(
      `📧 Customer: ${customerInfo.email} (${customerInfo.firstName} ${customerInfo.lastName})`
    );

    res.json({
      success: true,
      message: "Registration completed successfully",
      registrationId: payment._id,
      sessionId: sessionId,
    });
  } catch (error) {
    console.error("❌ Error processing free registration:", error);
    next(error);
  }
};
