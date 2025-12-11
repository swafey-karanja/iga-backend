# iGaming AFRIKA - M-Pesa Payment Integration (MongoDB)

Backend API for processing M-Pesa payments for the iGaming AFRIKA Summit 2026 using MongoDB.

## 📁 Project Structure

```
backend/
├── server.js                 # Entry point
├── routes/
│   └── mpesaRoutes.js       # M-Pesa API routes
├── controllers/
│   └── mpesaController.js   # Business logic for M-Pesa
├── services/
│   ├── mpesaService.js      # M-Pesa API integration
│   └── emailService.js      # Email notifications
├── models/
│   └── mpesaTransaction.js  # MongoDB Mongoose model
├── middleware/
│   ├── validation.js        # Request validation
│   └── security.js          # Security middleware
├── database/
│   ├── setup.js             # Database initialization
│   └── seed.js              # Sample data seeding
├── .env.example             # Environment variables template
├── package.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)
- M-Pesa Developer Account ([Daraja Portal](https://developer.safaricom.co.ke/))
- ngrok (for local development callback testing)

### Installation

1. **Clone and navigate to backend directory**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your actual credentials.

4. **Start MongoDB**

   **Local MongoDB:**

   ```bash
   # Start MongoDB service
   mongod
   ```

   **MongoDB Atlas:**

   - Create a cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Get your connection string
   - Update `MONGODB_URI` in `.env`

5. **Initialize database**

   ```bash
   npm run setup
   ```

6. **Seed sample data (optional)**

   ```bash
   npm run seed
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

## 🗄️ MongoDB Setup

### Local MongoDB

```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify connection
mongo
```

### MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for development)
5. Get connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/igaming_afrika?retryWrites=true&w=majority
   ```
6. Update `MONGODB_URI` in `.env`

### Database Schema

The MongoDB schema is defined in `models/mpesaTransaction.js` using Mongoose:

**Fields:**

- M-Pesa specific: `merchantRequestId`, `checkoutRequestId`, `mpesaReceiptNumber`
- Transaction: `phoneNumber`, `amount`, `accountReference`, `transactionDesc`
- Customer: `customerEmail`, `customerName`, `customerPhone`, etc.
- Ticket: `ticketId`, `ticketLabel`, `promoCode`
- Status: `status`, `resultCode`, `resultDesc`
- Timestamps: `transactionDate`, `createdAt`, `updatedAt` (auto-managed)

**Indexes:**

- `checkoutRequestId` (unique)
- `merchantRequestId` (unique)
- `customerEmail`
- `mpesaReceiptNumber`
- `status`
- `createdAt` (descending)

## 🔧 Configuration

### M-Pesa Sandbox Credentials

1. Go to [Daraja Portal](https://developer.safaricom.co.ke/)
2. Create an account and log in
3. Create a new app
4. Get your credentials:
   - Consumer Key
   - Consumer Secret
   - Passkey (from the "Test Credentials" section)
5. Use shortcode `174379` for sandbox

### Setting up Callback URL

For local development, use ngrok:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok on your server port
ngrok http 4242
```

Copy the HTTPS URL and update your `.env`:

```
MPESA_CALLBACK_URL=https://your-ngrok-url.ngrok.io/api/mpesa/callback
```

## 📡 API Endpoints

### 1. Initiate Payment

**POST** `/api/mpesa/initiate`

Request body:

```json
{
  "phoneNumber": "254712345678",
  "amount": 1500,
  "ticketId": "STANDARD",
  "ticketLabel": "Standard Ticket",
  "customerInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "254712345678",
    "country": "Kenya"
  }
}
```

Response:

```json
{
  "success": true,
  "checkoutRequestId": "ws_CO_DMZ_123456789_01012024123456",
  "message": "Please check your phone for the M-Pesa prompt"
}
```

### 2. M-Pesa Callback

**POST** `/api/mpesa/callback`

Automatically called by Safaricom when payment is processed.

### 3. Check Payment Status

**GET** `/api/mpesa/status/:checkoutRequestId`

Response:

```json
{
  "success": true,
  "status": "completed",
  "mpesaReceiptNumber": "QAB1CD2EFG",
  "resultDesc": "The service request is processed successfully.",
  "amount": 1500,
  "transactionDate": "2026-01-04T12:34:56.000Z"
}
```

### 4. Query Transaction

**GET** `/api/mpesa/query/:checkoutRequestId`

Manually queries M-Pesa API for transaction status.

### 5. Transaction Summary (Admin)

**GET** `/api/mpesa/summary`

Response:

```json
{
  "success": true,
  "data": {
    "totalTransactions": 150,
    "completedTransactions": 120,
    "pendingTransactions": 15,
    "failedTransactions": 15,
    "totalRevenue": 180000
  }
}
```

### 6. Customer Transactions (Admin)

**GET** `/api/mpesa/customer/:email`

Get all transactions for a specific customer email.

## 🧪 Testing

### Sandbox Testing

1. Use test phone numbers: `254708374149` or `254711111111`
2. Use any 4-digit PIN (e.g., `1234`) in sandbox
3. STK Push will appear on the test phone
4. Check your server logs for callback data

### Testing Flow

```bash
# 1. Start MongoDB
mongod  # or use MongoDB Atlas

# 2. Start your server
npm run dev

# 3. In another terminal, start ngrok
ngrok http 4242

# 4. Update MPESA_CALLBACK_URL in .env with ngrok URL

# 5. Make a test payment request
curl -X POST http://localhost:4242/api/mpesa/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254708374149",
    "amount": 1,
    "ticketId": "TEST",
    "ticketLabel": "Test Ticket",
    "customerInfo": {
      "firstName": "Test",
      "lastName": "User",
      "email": "test@example.com",
      "phone": "254708374149",
      "country": "Kenya"
    }
  }'

# 6. Check callback logs in server console
```

### MongoDB Queries for Testing

```javascript
// Connect to MongoDB shell
mongosh

// Use the database
use igaming_afrika

// View all transactions
db.mpesatransactions.find().pretty()

// View completed transactions
db.mpesatransactions.find({ status: "completed" }).pretty()

// View transactions for a specific email
db.mpesatransactions.find({ customerEmail: "john@example.com" }).pretty()

// Count transactions by status
db.mpesatransactions.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])

// Get total revenue
db.mpesatransactions.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: null, totalRevenue: { $sum: "$amount" } } }
])
```

## 🔒 Security Features

- IP verification for M-Pesa callbacks (production only)
- Rate limiting on payment initiation
- Input validation and sanitization
- Mongoose schema validation
- HTTPS required for production

## 📊 Database Operations

### Using Mongoose Methods

```javascript
// Find transaction
const transaction = await MpesaTransaction.findByCheckoutRequestId(
  checkoutRequestId
);

// Get all customer transactions
const transactions = await MpesaTransaction.findByEmail("customer@example.com");

// Get successful transactions
const successful = await MpesaTransaction.findSuccessful(100);

// Get stale pending transactions (older than 5 minutes)
const stale = await MpesaTransaction.findStalePending(5);

// Get transaction summary
const summary = await MpesaTransaction.getTransactionSummary();

// Update transaction status
await transaction.updateStatus("completed", "0", "Success", "QAB1CD2EFG");
```

## 🚀 Production Deployment

### Pre-deployment Checklist

- [ ] Use MongoDB Atlas or managed MongoDB service
- [ ] Set up database backups
- [ ] Enable authentication on MongoDB
- [ ] Use strong database password
- [ ] Get production M-Pesa credentials
- [ ] Update `.env` with production values
- [ ] Set `MPESA_ENV=production`
- [ ] Set up SSL certificate for callback URL
- [ ] Register production callback URL with Safaricom
- [ ] Test with small amounts first
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Configure email service for notifications
- [ ] Set up MongoDB indexes in production
- [ ] Enable MongoDB connection pooling

### Environment Variables for Production

```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/igaming_afrika
MPESA_ENV=production
MPESA_CONSUMER_KEY=your_prod_key
MPESA_CONSUMER_SECRET=your_prod_secret
MPESA_BUSINESS_SHORTCODE=your_prod_shortcode
MPESA_PASSKEY=your_prod_passkey
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
```

## 🐛 Troubleshooting

### Common Issues

1. **"MongoError: connection refused"**

   - Ensure MongoDB is running
   - Check `MONGODB_URI` in `.env`
   - Verify network connectivity (for Atlas)

2. **"Failed to authenticate with M-Pesa"**

   - Check your Consumer Key and Secret
   - Ensure you're using the correct environment (sandbox/production)

3. **"Invalid phone number format"**

   - Use format: `254XXXXXXXXX` (Kenya)
   - Remove spaces, dashes, and parentheses

4. **Callback not received**

   - Verify ngrok is running (for local dev)
   - Check callback URL is correct in `.env`
   - Ensure URL is HTTPS
   - Check server logs for errors

5. **"Transaction not found"**
   - Payment might still be pending
   - User might have cancelled the prompt
   - Check MongoDB for transaction record

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check connection string
echo $MONGODB_URI

# Test connection with Node.js
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(e => console.error(e))"
```

### Debug Mode

Enable detailed logging:

```javascript
// In server.js
mongoose.set("debug", true);

// In mpesaService.js, uncomment console.log statements
console.log("STK Push Request:", payload);
console.log("STK Push Response:", response.data);
```

## 📧 Email Notifications

Configure SMTP settings in `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

For Gmail, create an [App Password](https://support.google.com/accounts/answer/185833).

## 🔄 MongoDB vs PostgreSQL

**Advantages of MongoDB for this use case:**

- Flexible schema for varying transaction data
- No migrations needed for schema changes
- Better for horizontal scaling
- Built-in aggregation framework
- Easy to add new fields without ALTER TABLE
- JSON-like documents match M-Pesa callback structure

**Trade-offs:**

- Less strict data validation (mitigated with Mongoose)
- No ACID transactions across multiple collections (not needed here)
- Requires more application-level validation

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Support

For issues or questions:

- Email: support@igamingafrika.com
- GitHub Issues: [Create an issue](https://github.com/yourusername/repo/issues)

## 🔗 Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Safaricom Daraja API Docs](https://developer.safaricom.co.ke/APIs)
- [M-Pesa STK Push Documentation](https://developer.safaricom.co.ke/APIs/MpesaExpressSimulate)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

# Complete Setup Guide for Stripe

## 📁 Project Structure

```
backend/
├── server.js                      # Entry point
├── .env                           # Environment variables
├── .gitignore                     # Git ignore file
├── package.json                   # Dependencies
├── config/
│   └── database.js               # MongoDB connection
├── models/
│   └── Payment.js                # Payment schema
├── controllers/
│   ├── paymentController.js      # Payment logic
│   └── webhookController.js      # Webhook handlers
├── routes/
│   ├── paymentRoutes.js          # Payment endpoints
│   └── webhookRoutes.js          # Webhook endpoint
└── middleware/
    ├── errorHandler.js           # Error handling
    └── stripeWebhook.js          # Webhook verification
```

## 🚀 Installation Steps

### 1. Create the Project Structure

```bash
# Create main backend directory
mkdir backend
cd backend

# Create subdirectories
mkdir config models controllers routes middleware

# Create all files
touch server.js .env .gitignore package.json
touch config/database.js
touch models/Payment.js
touch controllers/paymentController.js controllers/webhookController.js
touch routes/paymentRoutes.js routes/webhookRoutes.js
touch middleware/errorHandler.js middleware/stripeWebhook.js
```

### 2. Copy File Contents

Copy the contents from each artifact into the corresponding files in your project.

### 3. Install Dependencies

```bash
npm install
```

This will install:

- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `stripe` - Stripe SDK
- `mongoose` - MongoDB ODM
- `dotenv` - Environment variables
- `nodemon` - Development auto-reload (dev dependency)

### 4. Configure Environment Variables

Update the `.env` file with your actual values:

```env
PORT=4242
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Get these from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_your_actual_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/stripe_payments
```

### 5. Set Up MongoDB

**Option A: Local MongoDB**

```bash
# Install MongoDB (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Or run manually
mongod --config /usr/local/etc/mongod.conf
```

**Option B: MongoDB Atlas (Cloud)**

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create a database user
4. Whitelist your IP address
5. Get the connection string
6. Update `MONGODB_URI` in `.env`

### 6. Set Up Stripe Webhook (Local Development)

```bash
# Install Stripe CLI
# macOS
brew install stripe/stripe-cli/stripe

# Windows (with Scoop)
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# Linux
# Download from https://github.com/stripe/stripe-cli/releases

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:4242/webhook
```

This will display a webhook signing secret like:

```
whsec_xxxxxxxxxxxxxxxxxxxxx
```

Copy this and update `STRIPE_WEBHOOK_SECRET` in your `.env` file.

## 🎯 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### With Stripe Webhook Forwarding

Open two terminals:

**Terminal 1:**

```bash
npm run dev
```

**Terminal 2:**

```bash
stripe listen --forward-to localhost:4242/webhook
```

## 📡 API Endpoints

### Payment Endpoints

| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| POST   | `/create-checkout-session`       | Create checkout session |
| GET    | `/session-status?session_id=xxx` | Get session status      |
| GET    | `/api/payments`                  | Get all payments        |
| GET    | `/api/payment/:sessionId`        | Get specific payment    |
| GET    | `/api/payment-stats`             | Get payment statistics  |

### Webhook Endpoint

| Method | Endpoint   | Description            |
| ------ | ---------- | ---------------------- |
| POST   | `/webhook` | Stripe webhook handler |

### Example API Calls

**Create Checkout Session:**

```bash
curl -X POST http://localhost:4242/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "price_1234567890",
    "promoCode": "SAVE20",
    "idempotencyKey": "unique-key-123"
  }'
```

**Get All Payments:**

```bash
curl http://localhost:4242/api/payments?status=succeeded&limit=10
```

**Get Payment by Session ID:**

```bash
curl http://localhost:4242/api/payment/cs_test_xxxxx
```

**Get Payment Stats:**

```bash
curl http://localhost:4242/api/payment-stats
```

## 🧪 Testing

### Test Webhook Events with Stripe CLI

```bash
# Test successful payment
stripe trigger checkout.session.completed

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test refund
stripe trigger charge.refunded
```

### Test with Frontend

1. Start your backend: `npm run dev`
2. Start Stripe webhook forwarding: `stripe listen --forward-to localhost:4242/webhook`
3. Start your frontend
4. Make a test payment using Stripe test card: `4242 4242 4242 4242`
5. Check MongoDB for the stored payment

### Verify Data in MongoDB

```bash
# Connect to MongoDB
mongosh

# Switch to your database
use stripe_payments

# View all payments
db.payments.find().pretty()

# View succeeded payments only
db.payments.find({ status: "succeeded" }).pretty()

# Count payments by status
db.payments.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

## 🔒 Security Best Practices

1. **Never commit `.env` file** - It's in `.gitignore`
2. **Use environment variables** - Never hardcode secrets
3. **Verify webhook signatures** - Already implemented in middleware
4. **Use HTTPS in production** - Required for Stripe webhooks
5. **Validate input** - Controllers validate all inputs
6. **Use proper error handling** - Global error handler catches all errors

## 📊 Monitoring & Logs

The application logs important events:

- ✅ Successful operations
- ❌ Errors
- 📨 Webhook events received
- 💳 Payment processing
- 💰 Refunds

Watch logs in your terminal to monitor activity.

## 🐛 Troubleshooting

### Webhook not receiving events

**Problem:** Stripe CLI says "Ready!" but no events are received

**Solution:**

1. Check Stripe CLI is running: `stripe listen --forward-to localhost:4242/webhook`
2. Verify webhook secret in `.env` matches Stripe CLI output
3. Check server is running on port 4242
4. Look for error logs in terminal

### MongoDB connection failed

**Problem:** `MongoDB connection error: connect ECONNREFUSED`

**Solution:**

1. Check MongoDB is running: `brew services list` (macOS)
2. Verify connection string in `.env`
3. For Atlas, check IP whitelist and credentials

### Webhook signature verification failed

**Problem:** `Webhook signature verification failed`

**Solution:**

1. Update `STRIPE_WEBHOOK_SECRET` in `.env` with current value from Stripe CLI
2. Restart your server after updating `.env`
3. Make sure you're using `stripe listen` not just `stripe trigger`

### Payment not saving to database

**Problem:** Webhook received but no database record

**Solution:**

1. Check MongoDB connection is successful (look for "✅ MongoDB Connected")
2. Check webhook handler logs for errors
3. Verify Payment model schema matches data structure
4. Check for validation errors in logs

## 🚀 Production Deployment

### 1. Set up production webhook endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter: `https://yourdomain.com/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the signing secret
6. Update production environment variable

### 2. Update environment variables

```env
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook_secret
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/production_db
```

### 3. Deploy

Deploy to your preferred platform:

- Heroku
- AWS
- DigitalOcean
- Vercel (for serverless)
- Railway

Make sure to:

- Set all environment variables
- Use HTTPS
- Configure CORS for your production domain
- Set up proper logging and monitoring

## 📚 Additional Resources

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)
- [Mongoose Documentation](https://mongoosejs.com/)

## 🎉 You're All Set!

Your backend is now fully structured with:

- ✅ Organized folder structure
- ✅ Webhook processing
- ✅ MongoDB integration
- ✅ Error handling
- ✅ Comprehensive API endpoints
- ✅ Payment tracking
- ✅ Refund handling

Start building amazing payment experiences! 🚀
