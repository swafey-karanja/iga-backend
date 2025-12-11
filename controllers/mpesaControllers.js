// controllers/mpesaController.js
const mpesaService = require("../services/mpesaService");
const MpesaTransaction = require("../models/mpesaTransaction");
const { sendConfirmationEmail } = require("../services/emailService");

class MpesaController {
  /**
   * Initiate M-Pesa STK Push payment
   */
  async initiatePayment(req, res) {
    try {
      const {
        phoneNumber,
        amount,
        ticketId,
        ticketLabel,
        customerInfo,
        promoCode,
      } = req.body;

      console.log("Initiating M-Pesa payment for:", customerInfo.email);

      // Initiate STK Push
      const result = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        ticketId || "TICKET",
        `Payment for ${ticketLabel || "Event Ticket"}`
      );

      // Save transaction to database
      const transaction = new MpesaTransaction({
        merchantRequestId: result.merchantRequestId,
        checkoutRequestId: result.checkoutRequestId,
        phoneNumber: phoneNumber,
        amount: amount,
        accountReference: ticketId,
        transactionDesc: `Payment for ${ticketLabel}`,
        customerEmail: customerInfo.email,
        customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
        customerFirstName: customerInfo.firstName,
        customerLastName: customerInfo.lastName,
        customerPhone: customerInfo.phone,
        customerCompany: customerInfo.company || null,
        customerJobTitle: customerInfo.jobTitle || null,
        customerCountry: customerInfo.country,
        ticketId: ticketId,
        ticketLabel: ticketLabel,
        promoCode: promoCode || null,
        status: "pending",
      });

      await transaction.save();

      console.log("M-Pesa transaction saved:", result.checkoutRequestId);

      res.json({
        success: true,
        checkoutRequestId: result.checkoutRequestId,
        message:
          result.customerMessage ||
          "Please check your phone for the M-Pesa prompt",
      });
    } catch (error) {
      console.error("M-Pesa initiation error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to initiate M-Pesa payment",
      });
    }
  }

  /**
   * Handle M-Pesa callback
   */
  async handleCallback(req, res) {
    // Always acknowledge receipt immediately
    res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Success",
    });

    try {
      console.log(
        "M-Pesa Callback Received:",
        JSON.stringify(req.body, null, 2)
      );

      const { Body } = req.body;

      if (!Body || !Body.stkCallback) {
        console.error("Invalid callback format");
        return;
      }

      const { stkCallback } = Body;
      const {
        MerchantRequestID,
        CheckoutRequestID,
        ResultCode,
        ResultDesc,
        CallbackMetadata,
      } = stkCallback;

      // Find transaction in database
      const transaction = await MpesaTransaction.findByCheckoutRequestId(
        CheckoutRequestID
      );

      if (!transaction) {
        console.error(
          "Transaction not found for checkout request:",
          CheckoutRequestID
        );
        return;
      }

      // Update transaction status
      if (ResultCode === 0) {
        // Payment successful
        const metadata = CallbackMetadata?.Item || [];
        const amount = metadata.find((item) => item.Name === "Amount")?.Value;
        const mpesaReceiptNumber = metadata.find(
          (item) => item.Name === "MpesaReceiptNumber"
        )?.Value;
        const transactionDate = metadata.find(
          (item) => item.Name === "TransactionDate"
        )?.Value;
        const phoneNumber = metadata.find(
          (item) => item.Name === "PhoneNumber"
        )?.Value;

        console.log("Payment successful:", mpesaReceiptNumber);

        // Update transaction
        await transaction.updateStatus(
          "completed",
          String(ResultCode),
          ResultDesc,
          mpesaReceiptNumber,
          transactionDate ? new Date(transactionDate) : new Date()
        );

        // Send confirmation email
        await sendConfirmationEmail({
          email: transaction.customerEmail,
          name: transaction.customerName,
          ticketLabel: transaction.ticketLabel,
          amount: transaction.amount,
          mpesaReceiptNumber: mpesaReceiptNumber,
          paymentMethod: "M-Pesa",
        }).catch((err) => {
          console.error("Failed to send confirmation email:", err);
        });

        console.log("Transaction updated to completed");
      } else {
        // Payment failed or cancelled
        console.log("Payment failed:", ResultDesc);

        await transaction.updateStatus(
          "failed",
          String(ResultCode),
          ResultDesc
        );

        console.log("Transaction updated to failed");
      }
    } catch (error) {
      console.error("M-Pesa callback processing error:", error);
    }
  }

  /**
   * Check payment status from database
   */
  async checkPaymentStatus(req, res) {
    try {
      const { checkoutRequestId } = req.params;

      // Get transaction from database
      const transaction = await MpesaTransaction.findByCheckoutRequestId(
        checkoutRequestId
      );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found",
        });
      }

      // If still pending, query M-Pesa API for latest status
      if (transaction.status === "pending") {
        try {
          const mpesaStatus = await mpesaService.querySTKPushStatus(
            checkoutRequestId
          );

          // Update status based on M-Pesa response
          if (mpesaStatus.ResultCode === "0") {
            await transaction.updateStatus(
              "completed",
              mpesaStatus.ResultCode,
              mpesaStatus.ResultDesc
            );
          } else if (mpesaStatus.ResultCode !== "1032") {
            // 1032 = Request cancelled by user (still pending)
            await transaction.updateStatus(
              "failed",
              mpesaStatus.ResultCode,
              mpesaStatus.ResultDesc
            );
          }
        } catch (queryError) {
          console.error("Error querying M-Pesa status:", queryError);
          // Don't fail the request, just return current DB status
        }
      }

      res.json({
        success: true,
        status: transaction.status,
        mpesaReceiptNumber: transaction.mpesaReceiptNumber,
        resultDesc: transaction.resultDesc,
        amount: transaction.amount,
        transactionDate: transaction.transactionDate,
      });
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check payment status",
      });
    }
  }

  /**
   * Query M-Pesa transaction status directly from API
   */
  async queryTransaction(req, res) {
    try {
      const { checkoutRequestId } = req.params;

      // Query M-Pesa API
      const mpesaStatus = await mpesaService.querySTKPushStatus(
        checkoutRequestId
      );

      res.json({
        success: true,
        resultCode: mpesaStatus.ResultCode,
        resultDesc: mpesaStatus.ResultDesc,
        merchantRequestId: mpesaStatus.MerchantRequestID,
        checkoutRequestId: mpesaStatus.CheckoutRequestID,
      });
    } catch (error) {
      console.error("Query transaction error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to query transaction status",
      });
    }
  }

  /**
   * Get transaction summary (admin endpoint)
   */
  async getTransactionSummary(req, res) {
    try {
      const summary = await MpesaTransaction.getTransactionSummary();
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Error getting transaction summary:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get transaction summary",
      });
    }
  }

  /**
   * Get all transactions for a customer (by email)
   */
  async getCustomerTransactions(req, res) {
    try {
      const { email } = req.params;

      const transactions = await MpesaTransaction.findByEmail(email);

      res.json({
        success: true,
        count: transactions.length,
        data: transactions,
      });
    } catch (error) {
      console.error("Error getting customer transactions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get customer transactions",
      });
    }
  }
}

module.exports = new MpesaController();
