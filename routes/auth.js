const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ Login attempt: User not found - ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log(`🔍 Login attempt: ${email}`);
    console.log(`🔍 User found: ${user._id}`);
    console.log(`🔍 Current role: ${user.role} (type: ${typeof user.role})`);
    console.log(`🔍 Role value (JSON): ${JSON.stringify(user.role)}`);
    console.log(`🔍 Role check: admin=${user.role === 'admin'}, super_admin=${user.role === 'super_admin'}`);
    console.log(`🔍 Role enum values: ${User.schema.path('role').enumValues}`);
    console.log(`🔍 super_admin in enum: ${User.schema.path('role').enumValues.includes('super_admin')}`);

    // Explicit role check with string comparison
    const userRole = String(user.role).trim();
    const isAdmin = userRole === 'admin';
    const isSuperAdmin = userRole === 'super_admin';
    
    console.log(`🔍 Normalized role check: isAdmin=${isAdmin}, isSuperAdmin=${isSuperAdmin}`);

    if (!isAdmin && !isSuperAdmin) {
      console.log(`❌ Login attempt: Non-admin user - ${email} (role: ${userRole})`);
      return res.status(403).json({ success: false, message: 'Admin access required. Please contact an administrator.' });
    }
    
    console.log(`✅ Role check passed for ${email} (${userRole})`);

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      console.log(`❌ Login attempt: Invalid password - ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    console.log(`✅ Admin login successful: ${email}`);

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Verify Token
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log(`❌ Verify token: User not found - ${decoded.userId}`);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Explicit role check with string comparison
    const userRole = String(user.role).trim();
    const isAdmin = userRole === 'admin';
    const isSuperAdmin = userRole === 'super_admin';
    
    console.log(`🔍 Verify token: ${user.email} - role: ${userRole}, isAdmin: ${isAdmin}, isSuperAdmin: ${isSuperAdmin}`);

    if (!isAdmin && !isSuperAdmin) {
      console.log(`❌ Verify token: Non-admin user - ${user.email} (role: ${userRole})`);
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    
    console.log(`✅ Token verified for ${user.email} (${userRole})`);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Update Profile (authenticated user's own profile)
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { email, username, displayName } = req.body;

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      user.email = email.toLowerCase();
    }

    // Update other fields
    if (username !== undefined) user.username = username;
    if (displayName !== undefined) user.displayName = displayName;

    await user.save();

    console.log(`✅ Profile updated for ${user.email}`);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        displayName: user.displayName
      }
    });
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// Change Password
router.put('/change-password', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password changed for ${user.email}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

/**
 * Forgot Password - Request password reset
 * POST /api/admin/auth/forgot-password
 * Request Body: { email, useOTP: true/false (optional, default: false) }
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, useOTP } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // Find user by email
    const user = await User.findByEmail(email.toLowerCase());
    
    // Always return success message (security best practice - don't reveal if email exists)
    // But only send email if user exists and is admin/super_admin
    if (user) {
      // Check if user is admin or super_admin
      const userRole = String(user.role).trim();
      const isAdmin = userRole === 'admin';
      const isSuperAdmin = userRole === 'super_admin';
      
      if (!isAdmin && !isSuperAdmin) {
        // Return success even if not admin (security best practice)
        return res.json({
          success: true,
          message: 'If an admin account with that email exists, a password reset email has been sent.',
        });
      }

      try {
        // Generate reset token or OTP
        let resetToken;
        let resetUrl;
        
        if (useOTP === true) {
          // Generate 6-digit OTP
          const otpCode = user.generatePasswordResetOTP();
          await user.save();
          
          // Send OTP via email
          const { sendPasswordResetOTP } = require('../utils/emailService');
          await sendPasswordResetOTP(user.email, otpCode);
          
          return res.json({
            success: true,
            message: 'Password reset code has been sent to your email',
            // In development, return OTP for testing (remove in production)
            ...(process.env.NODE_ENV === 'development' && { otpCode }),
          });
        } else {
          // Generate reset token
          resetToken = user.generatePasswordResetToken();
          await user.save();
          
          // Build reset URL (pointing to admin panel)
          const baseUrl = process.env.ADMIN_PANEL_URL || process.env.RESET_PASSWORD_URL || 'http://localhost:3000';
          resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
          
          // Send reset link via email
          const { sendPasswordResetEmail } = require('../utils/emailService');
          await sendPasswordResetEmail(user.email, resetToken, resetUrl);
          
          return res.json({
            success: true,
            message: 'Password reset email has been sent',
            // In development, return reset URL for testing (remove in production)
            ...(process.env.NODE_ENV === 'development' && { resetUrl, resetToken }),
          });
        }
      } catch (emailError) {
        console.error('❌ Error sending password reset email:', emailError);
        // Still return success to user (don't reveal email sending failure)
        return res.json({
          success: true,
          message: 'If an admin account with that email exists, a password reset email has been sent.',
        });
      }
    } else {
      // User not found - return success anyway (security best practice)
      return res.json({
        success: true,
        message: 'If an admin account with that email exists, a password reset email has been sent.',
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * Reset Password - Reset password using token or OTP
 * POST /api/admin/auth/reset-password
 * Request Body: { token (or otpCode), newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, otpCode, newPassword } = req.body;

    // Validation
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required',
      });
    }

    if (!token && !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Reset token or OTP code is required',
      });
    }

    // Validate new password strength
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // Check password has capital letter and symbol
    const hasCapital = /[A-Z]/.test(newPassword);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!hasCapital || !hasSymbol) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one capital letter and one symbol',
      });
    }

    // Find user by reset token
    const resetValue = token || otpCode;
    const user = await User.findByResetToken(resetValue);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token/OTP',
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log(`✅ Password reset successful for ${user.email}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error processing password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
