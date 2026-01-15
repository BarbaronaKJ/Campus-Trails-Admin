const nodemailer = require('nodemailer');

/**
 * Email Service for sending password reset emails
 * Configure your email service in .env file
 */

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email service not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env file');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST, // e.g., 'smtp.gmail.com', 'smtp.outlook.com'
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS, // Your email password or app-specific password
    },
  });
};

/**
 * Send password reset email with reset link
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @param {string} resetUrl - Full URL to reset password page
 * @returns {Promise<Object>} Email send result
 */
const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      // In development or when email not configured, log the reset URL instead of sending email
      console.log('\n📧 Password Reset Email (Development Mode - Email not configured):');
      console.log(`   To: ${email}`);
      console.log(`   Reset URL: ${resetUrl}`);
      console.log(`   Token: ${resetToken}`);
      console.log(`   ⚠️  To enable email sending, configure EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env\n`);
      return { success: true, message: 'Reset URL logged (development mode)' };
    }

    const mailOptions = {
      from: `"Campus Trails Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - Campus Trails Admin Panel',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f5f5f5; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Campus Trails Admin</h1>
            
            <h2 style="color: #34495e;">Password Reset Request</h2>
            
            <p>Hello,</p>
            
            <p>We received a request to reset your password for your Campus Trails Admin Panel account.</p>
            
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 12px; color: #7f8c8d;">
              Or copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #3498db; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <p style="font-size: 12px; color: #7f8c8d; margin-top: 30px;">
              <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            </p>
            
            <p style="font-size: 12px; color: #7f8c8d;">
              If you did not request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 11px; color: #95a5a6; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Campus Trails Admin - Password Reset Request
        
        Hello,
        
        We received a request to reset your password for your Campus Trails Admin Panel account.
        
        Click the link below to reset your password:
        ${resetUrl}
        
        This link will expire in 1 hour for security reasons.
        
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send password reset email with 6-digit OTP code
 * @param {string} email - User's email address
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Promise<Object>} Email send result
 */
const sendPasswordResetOTP = async (email, otpCode) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      // In development, log the OTP instead of sending email
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 Password Reset OTP (Development Mode):');
        console.log(`   To: ${email}`);
        console.log(`   OTP Code: ${otpCode}\n`);
        return { success: true, message: 'OTP logged (development mode)' };
      }
      throw new Error('Email service not configured');
    }

    const mailOptions = {
      from: `"Campus Trails Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Code - Campus Trails Admin Panel',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f5f5f5; padding: 30px; border-radius: 10px;">
            <h1 style="color: #2c3e50; text-align: center; margin-bottom: 30px;">Campus Trails Admin</h1>
            
            <h2 style="color: #34495e;">Password Reset Code</h2>
            
            <p>Hello,</p>
            
            <p>We received a request to reset your password for your Campus Trails Admin Panel account.</p>
            
            <p>Your password reset code is:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #3498db; color: white; padding: 20px; border-radius: 5px; font-size: 32px; font-weight: bold; letter-spacing: 5px; display: inline-block;">
                ${otpCode}
              </div>
            </div>
            
            <p style="font-size: 12px; color: #7f8c8d; margin-top: 30px;">
              <strong>Important:</strong> This code will expire in 1 hour for security reasons.
            </p>
            
            <p style="font-size: 12px; color: #7f8c8d;">
              If you did not request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="font-size: 11px; color: #95a5a6; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Campus Trails Admin - Password Reset Code
        
        Hello,
        
        We received a request to reset your password for your Campus Trails Admin Panel account.
        
        Your password reset code is: ${otpCode}
        
        This code will expire in 1 hour for security reasons.
        
        If you did not request a password reset, please ignore this email. Your password will remain unchanged.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset OTP email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendPasswordResetOTP,
};
