// services/mpesaService.js
const axios = require("axios");
const moment = require("moment");

class MpesaService {
  constructor() {
    this.consumerKey = process.env.CONSUMER_KEY;
    this.consumerSecret = process.env.CONSUMER_SECRET;
    this.businessShortCode = process.env.BUSINESS_SHORT_CODE;
    this.passkey = process.env.PASS_KEY;
    this.callbackUrl = process.env.CALLBACK_URL;

    // Sandbox or Production
    this.baseUrl =
      process.env.MPESA_ENV === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";

    // Cache for access token
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Generate OAuth access token
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (
      this.accessToken &&
      this.tokenExpiry &&
      moment().isBefore(this.tokenExpiry)
    ) {
      console.log("Using cached M-Pesa access token");
      return this.accessToken;
    }

    // Validate credentials before making request
    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error(
        "M-Pesa Consumer Key or Consumer Secret is not configured. Check your .env file."
      );
    }

    const auth = Buffer.from(
      `${this.consumerKey}:${this.consumerSecret}`
    ).toString("base64");

    console.log("Requesting new M-Pesa access token...");
    console.log("Environment:", this.baseUrl);

    try {
      const response = await axios.get(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 3599 seconds, cache for 3500 seconds to be safe
      this.tokenExpiry = moment().add(3500, "seconds");

      console.log("✓ M-Pesa access token generated successfully");
      return this.accessToken;
    } catch (error) {
      console.error("✗ Error getting M-Pesa token:");

      if (error.response) {
        console.error("Status:", error.response.status);
        console.error(
          "Response:",
          JSON.stringify(error.response.data, null, 2)
        );

        // Provide specific error messages
        if (error.response.status === 401 || error.response.status === 400) {
          throw new Error(
            "Invalid M-Pesa credentials. Please verify your Consumer Key and Consumer Secret in the .env file. " +
              "Also ensure you are using the correct environment (sandbox/production)."
          );
        }
      } else if (error.request) {
        console.error("No response received from M-Pesa API");
        throw new Error(
          "Unable to connect to M-Pesa API. Please check your internet connection."
        );
      } else {
        console.error("Error:", error.message);
      }

      throw new Error(
        "Failed to authenticate with M-Pesa: " +
          (error.response?.data?.errorMessage || error.message)
      );
    }
  }

  /**
   * Generate password for STK Push
   */
  generatePassword() {
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from(
      `${this.businessShortCode}${this.passkey}${timestamp}`
    ).toString("base64");
    return { password, timestamp };
  }

  /**
   * Format phone number to M-Pesa format (254XXXXXXXXX)
   */
  formatPhoneNumber(phone) {
    // Remove any spaces, dashes, plus signs, or parentheses
    let formatted = phone.replace(/[\s\-\+\(\)]/g, "");

    // If starts with 0, replace with 254
    if (formatted.startsWith("0")) {
      formatted = "254" + formatted.substring(1);
    }

    // If doesn't start with 254, add it
    if (!formatted.startsWith("254")) {
      formatted = "254" + formatted;
    }

    // Validate length (should be 12 digits for Kenya)
    if (formatted.length !== 12) {
      throw new Error(
        "Invalid phone number format. Expected format: 254XXXXXXXXX"
      );
    }

    return formatted;
  }

  /**
   * Initiate STK Push request
   */
  async initiateSTKPush(
    phoneNumber,
    amount,
    accountReference,
    transactionDesc
  ) {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    // Ensure amount is a whole number
    const wholeAmount = Math.ceil(parseFloat(amount));

    const payload = {
      BusinessShortCode: this.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: wholeAmount,
      PartyA: formattedPhone, // Customer phone number
      PartyB: this.businessShortCode, // Business receiving the payment
      PhoneNumber: formattedPhone, // Phone to receive the STK push
      CallBackURL: this.callbackUrl,
      AccountReference: accountReference, // e.g., ticket ID or order number
      TransactionDesc: transactionDesc || "Payment",
    };

    console.log("Initiating STK Push:", {
      phone: formattedPhone,
      amount: wholeAmount,
      reference: accountReference,
    });

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("STK Push Response:", response.data);

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage,
      };
    } catch (error) {
      console.error("M-Pesa STK Push Error:", error.response?.data);

      const errorMessage =
        error.response?.data?.errorMessage ||
        error.response?.data?.errorCode ||
        "Failed to initiate M-Pesa payment";

      throw new Error(errorMessage);
    }
  }

  /**
   * Query STK Push transaction status
   */
  async querySTKPushStatus(checkoutRequestId) {
    const accessToken = await this.getAccessToken();
    const { password, timestamp } = this.generatePassword();

    const payload = {
      BusinessShortCode: this.businessShortCode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    console.log("Querying STK Push status:", checkoutRequestId);

    try {
      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("STK Push Query Response:", response.data);
      return response.data;
    } catch (error) {
      console.error("M-Pesa Query Error:", error.response?.data);
      throw new Error("Failed to query M-Pesa payment status");
    }
  }

  /**
   * Convert USD to KES (if needed)
   * You can integrate with a currency API or use a fixed rate
   */
  convertUSDtoKES(usdAmount) {
    const exchangeRate = 150; // Update this or fetch from API
    return Math.ceil(usdAmount * exchangeRate);
  }
}

module.exports = new MpesaService();
