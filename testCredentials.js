// test-credentials.js
// Run this file to test your M-Pesa credentials
require("dotenv").config();
const axios = require("axios");

async function testCredentials() {
  console.log("Testing M-Pesa Credentials...\n");

  // Check if environment variables are loaded
  console.log("Environment Variables:");
  console.log(
    "CONSUMER_KEY:",
    process.env.CONSUMER_KEY ? "✓ Set" : "✗ Missing"
  );
  console.log(
    "CONSUMER_SECRET:",
    process.env.CONSUMER_SECRET ? "✓ Set" : "✗ Missing"
  );
  console.log("BUSINESS_SHORT_CODE:", process.env.BUSINESS_SHORT_CODE);
  console.log("PASS_KEY:", process.env.PASS_KEY ? "✓ Set" : "✗ Missing");
  console.log("MPESA_ENV:", process.env.MPESA_ENV || "sandbox");
  console.log("");

  const consumerKey = process.env.CONSUMER_KEY;
  const consumerSecret = process.env.CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    console.error("✗ Consumer Key or Consumer Secret is missing!");
    console.log("\nPlease check your .env file and ensure:");
    console.log("CONSUMER_KEY=your_key_here");
    console.log("CONSUMER_SECRET=your_secret_here");
    return;
  }

  // Test getting access token
  const baseUrl =
    process.env.MPESA_ENV === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString(
    "base64"
  );

  console.log("Testing OAuth Token Generation...");
  console.log("Base URL:", baseUrl);
  console.log("Authorization Header (base64):", auth.substring(0, 20) + "...");
  console.log("");

  try {
    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log("✓ Success! Token generated successfully");
    console.log(
      "Access Token:",
      response.data.access_token.substring(0, 30) + "..."
    );
    console.log("Expires In:", response.data.expires_in, "seconds");
    console.log("\nYour M-Pesa credentials are working correctly! ✓");
  } catch (error) {
    console.error("✗ Failed to generate access token\n");

    if (error.response) {
      console.error("Error Response:");
      console.error("Status:", error.response.status);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401 || error.response.status === 400) {
        console.log("\n⚠️  Common Issues:");
        console.log("1. Consumer Key or Consumer Secret is incorrect");
        console.log(
          "2. You are using Production credentials in Sandbox mode (or vice versa)"
        );
        console.log(
          "3. Your credentials have special characters that need to be properly copied"
        );
        console.log("4. Your Daraja app is not active");
        console.log("\n💡 Solutions:");
        console.log("1. Go to https://developer.safaricom.co.ke/");
        console.log('2. Log in and go to "My Apps"');
        console.log("3. Click on your app");
        console.log(
          "4. Copy the Consumer Key and Consumer Secret again (carefully!)"
        );
        console.log(
          "5. Make sure MPESA_ENV in .env matches your credentials (sandbox/production)"
        );
      }
    } else if (error.request) {
      console.error("No response received from M-Pesa API");
      console.error("This could be a network issue or the M-Pesa API is down");
    } else {
      console.error("Error:", error.message);
    }
  }
}

testCredentials();
