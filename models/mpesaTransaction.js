// models/mpesaTransaction.js
const mongoose = require("mongoose");

const mpesaTransactionSchema = new mongoose.Schema(
  {
    // M-Pesa specific fields
    merchantRequestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    checkoutRequestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mpesaReceiptNumber: {
      type: String,
      default: null,
      index: true,
    },

    // Transaction details
    phoneNumber: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    accountReference: {
      type: String,
      default: null,
    },
    transactionDesc: {
      type: String,
      default: null,
    },

    // Customer information
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      default: null,
    },
    customerFirstName: {
      type: String,
      default: null,
    },
    customerLastName: {
      type: String,
      default: null,
    },
    customerPhone: {
      type: String,
      default: null,
    },
    customerCompany: {
      type: String,
      default: null,
    },
    customerJobTitle: {
      type: String,
      default: null,
    },
    customerCountry: {
      type: String,
      default: null,
    },

    // Ticket information
    ticketId: {
      type: String,
      default: null,
    },
    ticketLabel: {
      type: String,
      default: null,
    },
    promoCode: {
      type: String,
      default: null,
    },

    // Status tracking
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      required: true,
      index: true,
    },
    resultCode: {
      type: String,
      default: null,
    },
    resultDesc: {
      type: String,
      default: null,
    },

    // Timestamps
    transactionDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt
  }
);

// Indexes for better query performance
mpesaTransactionSchema.index({ createdAt: -1 });
mpesaTransactionSchema.index({ status: 1, createdAt: -1 });

// Static methods
mpesaTransactionSchema.statics.findByCheckoutRequestId = function (
  checkoutRequestId
) {
  return this.findOne({ checkoutRequestId });
};

mpesaTransactionSchema.statics.findByMerchantRequestId = function (
  merchantRequestId
) {
  return this.findOne({ merchantRequestId });
};

mpesaTransactionSchema.statics.findByEmail = function (email) {
  return this.find({ customerEmail: email.toLowerCase() }).sort({
    createdAt: -1,
  });
};

mpesaTransactionSchema.statics.findSuccessful = function (limit = 100) {
  return this.find({ status: "completed" })
    .sort({ transactionDate: -1 })
    .limit(limit);
};

mpesaTransactionSchema.statics.findStalePending = function (minutesOld = 5) {
  const cutoffTime = new Date(Date.now() - minutesOld * 60 * 1000);
  return this.find({
    status: "pending",
    createdAt: { $lt: cutoffTime },
  }).sort({ createdAt: 1 });
};

mpesaTransactionSchema.statics.getTransactionSummary = async function () {
  const summary = await this.aggregate([
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        completedTransactions: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        pendingTransactions: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        totalRevenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "completed"] }, "$amount", 0],
          },
        },
      },
    },
  ]);

  return (
    summary[0] || {
      totalTransactions: 0,
      completedTransactions: 0,
      pendingTransactions: 0,
      failedTransactions: 0,
      totalRevenue: 0,
    }
  );
};

// Instance methods
mpesaTransactionSchema.methods.updateStatus = function (
  status,
  resultCode = null,
  resultDesc = null,
  mpesaReceiptNumber = null,
  transactionDate = null
) {
  this.status = status;
  if (resultCode !== null) this.resultCode = resultCode;
  if (resultDesc !== null) this.resultDesc = resultDesc;
  if (mpesaReceiptNumber !== null) this.mpesaReceiptNumber = mpesaReceiptNumber;
  if (transactionDate !== null) this.transactionDate = transactionDate;

  return this.save();
};

mpesaTransactionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  // Remove mongoose version key
  delete obj.__v;
  return obj;
};

const MpesaTransaction = mongoose.model(
  "MpesaTransaction",
  mpesaTransactionSchema
);

module.exports = MpesaTransaction;
