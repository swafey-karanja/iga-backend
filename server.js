require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const webhookRoutes = require("./routes/webhookRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 4242;

// Connect to MongoDB
connectDB();

// Webhook routes MUST come before express.json() middleware
// because Stripe requires raw body for signature verification
app.use("/webhook", webhookRoutes);

// Middleware
app.use(express.static("public"));
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/", paymentRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
