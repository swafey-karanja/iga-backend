// services/emailService.js
const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Configure email transporter (use your email service)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send payment confirmation email
   */
  async sendConfirmationEmail(data) {
    const {
      email,
      name,
      ticketLabel,
      amount,
      mpesaReceiptNumber,
      paymentMethod,
    } = data;

    const mailOptions = {
      from: `"iGaming AFRIKA Summit" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "Registration Confirmed - iGaming AFRIKA Summit 2026",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #15803d, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #4b5563; }
            .info-value { color: #111827; }
            .footer { background: #111827; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .success-badge { background: #dcfce7; color: #15803d; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 Registration Confirmed!</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">iGaming AFRIKA Summit 2026</p>
            </div>
            
            <div class="content">
              <p>Dear ${name},</p>
              
              <p>Thank you for registering for the <strong>iGaming AFRIKA Summit 2026</strong>! We're excited to have you join us.</p>
              
              <div class="success-badge">✓ Payment Confirmed</div>
              
              <div class="ticket-info">
                <h3 style="margin-top: 0; color: #15803d;">Event Details</h3>
                <div class="info-row">
                  <span class="info-label">Event:</span>
                  <span class="info-value">iGaming AFRIKA Summit 2026</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Date:</span>
                  <span class="info-value">May 4-6, 2026</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Location:</span>
                  <span class="info-value">Nairobi, Kenya</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Ticket Type:</span>
                  <span class="info-value">${ticketLabel}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Amount Paid:</span>
                  <span class="info-value">KES ${amount}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Payment Method:</span>
                  <span class="info-value">${paymentMethod}</span>
                </div>
                ${
                  mpesaReceiptNumber
                    ? `
                <div class="info-row">
                  <span class="info-label">M-Pesa Receipt:</span>
                  <span class="info-value">${mpesaReceiptNumber}</span>
                </div>
                `
                    : ""
                }
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Your ticket has been confirmed and saved to your account</li>
                <li>A detailed event agenda will be sent closer to the event date</li>
                <li>You'll receive updates about speakers, networking opportunities, and more</li>
              </ul>
              
              <center>
                <a href="https://igamingafrika.com/my-tickets" class="button">View My Tickets</a>
              </center>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                If you have any questions, please don't hesitate to contact us at 
                <a href="mailto:support@igamingafrika.com" style="color: #16a34a;">support@igamingafrika.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">© 2026 iGaming AFRIKA Summit. All rights reserved.</p>
              <p style="margin: 10px 0 0 0;">
                <a href="https://igamingafrika.com" style="color: #9ca3af; text-decoration: none;">Website</a> | 
                <a href="https://twitter.com/igamingafrika" style="color: #9ca3af; text-decoration: none;">Twitter</a> | 
                <a href="https://linkedin.com/company/igamingafrika" style="color: #9ca3af; text-decoration: none;">LinkedIn</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log("Confirmation email sent to:", email);
      return { success: true };
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      throw error;
    }
  }

  /**
   * Send payment failed notification
   */
  async sendPaymentFailedEmail(data) {
    const { email, name, ticketLabel, reason } = data;

    const mailOptions = {
      from: `"iGaming AFRIKA Summit" <${
        process.env.SMTP_FROM || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "Payment Issue - iGaming AFRIKA Summit 2026",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #111827; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
            .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">Payment Issue</h1>
            </div>
            
            <div class="content">
              <p>Dear ${name},</p>
              
              <p>We encountered an issue processing your payment for the <strong>${ticketLabel}</strong> ticket.</p>
              
              <p><strong>Reason:</strong> ${
                reason || "Payment was not completed"
              }</p>
              
              <p>Don't worry! You can try again:</p>
              
              <center>
                <a href="https://igamingafrika.com/checkout" class="button">Try Again</a>
              </center>
              
              <p>If you continue to experience issues, please contact our support team at 
              <a href="mailto:support@igamingafrika.com" style="color: #16a34a;">support@igamingafrika.com</a></p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">© 2026 iGaming AFRIKA Summit. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log("Payment failed email sent to:", email);
      return { success: true };
    } catch (error) {
      console.error("Error sending payment failed email:", error);
      throw error;
    }
  }
}

module.exports = new EmailService();
