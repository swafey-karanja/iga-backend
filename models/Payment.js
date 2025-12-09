const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    // Stripe Information
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      index: true,
    },

    // Customer email for easy querying (extracted from metadata)
    customerEmail: {
      type: String,
      required: true,
      index: true,
    },

    // Payment Information
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    // Ticket/Product Information
    ticketId: {
      type: String,
    },
    ticketLabel: {
      type: String,
    },

    // Promo Code Information
    promoCode: {
      type: String,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },

    // Transaction Metadata (includes customerInfo)
    idempotencyKey: {
      type: String,
    },
    metadata: {
      type: Object,
      required: true,
      // metadata structure:
      // {
      //   customerInfo: {
      //     firstName, lastName, email, phone,
      //     company, jobTitle, country, agreeToTerms
      //   },
      //   ticketLabel, promoCode, idempotencyKey, etc.
      // }
    },

    // Refund Information
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for common queries
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ customerEmail: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ "metadata.customerInfo.country": 1 });

// Virtual for customer full name
PaymentSchema.virtual("customerFullName").get(function () {
  if (this.metadata?.customerInfo) {
    return `${this.metadata.customerInfo.firstName} ${this.metadata.customerInfo.lastName}`;
  }
  return null;
});

// Ensure virtuals are included in JSON
PaymentSchema.set("toJSON", { virtuals: true });
PaymentSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Payment", PaymentSchema);
