require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const webhookRoutes = require("./routes/webhookRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const errorHandler = require("./middleware/errorHandler");
const mpesaRoutes = require("./routes/mpesaRoutes");

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
app.use("/api/mpesa", mpesaRoutes);

// Health check
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    message: "M-Pesa service is running",
    database: dbStatus,
    environment: process.env.MPESA_ENV || "sandbox",
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`M-Pesa environment: ${process.env.MPESA_ENV || "sandbox"}`);
});
